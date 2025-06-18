
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ModelUpdate {
  provider: string;
  model_name: string;
  display_name: string;
  cost_per_1k_tokens: number;
  max_tokens: number;
  api_availability: string;
  pricing_source: string;
  capabilities: any;
  is_deprecated: boolean;
}

// Current pricing data (from official documentation)
const OPENAI_PRICING = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'o1-preview': { input: 0.015, output: 0.06 },
  'o1-mini': { input: 0.003, output: 0.012 }
};

const PERPLEXITY_PRICING = {
  'llama-3.1-sonar-small-128k-online': 0.0002,
  'llama-3.1-sonar-large-128k-online': 0.001,
  'llama-3.1-sonar-huge-128k-online': 0.005
};

async function fetchOpenAIModels(apiKey: string): Promise<ModelUpdate[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const models: ModelUpdate[] = [];

    // Filter to GPT models and known pricing
    const relevantModels = data.data.filter((model: any) => 
      model.id.includes('gpt') || model.id.includes('o1')
    );

    for (const model of relevantModels) {
      const modelId = model.id;
      const pricing = OPENAI_PRICING[modelId as keyof typeof OPENAI_PRICING];
      
      if (pricing) {
        // Use average of input/output pricing or single rate
        const avgPrice = typeof pricing === 'object' 
          ? (pricing.input + pricing.output) / 2 
          : pricing;

        models.push({
          provider: 'openai',
          model_name: modelId,
          display_name: modelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          cost_per_1k_tokens: avgPrice,
          max_tokens: model.context_window || 4096,
          api_availability: 'available',
          pricing_source: 'api',
          capabilities: {
            supports_functions: model.id.includes('gpt-4') || model.id.includes('gpt-3.5'),
            supports_vision: model.id.includes('gpt-4o') || model.id.includes('gpt-4-vision'),
            context_window: model.context_window || 4096
          },
          is_deprecated: false
        });
      }
    }

    return models;
  } catch (error) {
    console.error('Error fetching OpenAI models:', error);
    return [];
  }
}

async function fetchPerplexityModels(): Promise<ModelUpdate[]> {
  // Perplexity doesn't have a models API, so we use documented models
  const models: ModelUpdate[] = [];
  
  for (const [modelName, price] of Object.entries(PERPLEXITY_PRICING)) {
    models.push({
      provider: 'perplexity',
      model_name: modelName,
      display_name: modelName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      cost_per_1k_tokens: price,
      max_tokens: 128000,
      api_availability: 'available',
      pricing_source: 'documentation',
      capabilities: {
        supports_online: true,
        context_window: 128000
      },
      is_deprecated: false
    });
  }

  return models;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get API keys
    const { data: apiKeys } = await supabaseClient
      .from('api_keys')
      .select('service, is_active')
      .eq('is_active', true);

    const results = {
      updated_models: [] as ModelUpdate[],
      new_models: [] as ModelUpdate[],
      deprecated_models: [] as string[],
      errors: [] as string[]
    };

    // Fetch models from each active provider
    if (apiKeys?.some(key => key.service === 'openai')) {
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      if (openaiKey) {
        console.log('Fetching OpenAI models...');
        const openaiModels = await fetchOpenAIModels(openaiKey);
        results.updated_models.push(...openaiModels);
      } else {
        results.errors.push('OpenAI API key not found');
      }
    }

    if (apiKeys?.some(key => key.service === 'perplexity')) {
      console.log('Fetching Perplexity models...');
      const perplexityModels = await fetchPerplexityModels();
      results.updated_models.push(...perplexityModels);
    }

    // Get current models from database
    const { data: currentModels } = await supabaseClient
      .from('model_configurations')
      .select('*');

    // Update or insert models
    for (const model of results.updated_models) {
      const existingModel = currentModels?.find(
        m => m.provider === model.provider && m.model_name === model.model_name
      );

      const updateData = {
        provider: model.provider,
        model_name: model.model_name,
        display_name: model.display_name,
        cost_per_1k_tokens: model.cost_per_1k_tokens,
        max_tokens: model.max_tokens,
        api_availability: model.api_availability,
        pricing_source: model.pricing_source,
        capabilities: model.capabilities,
        is_deprecated: model.is_deprecated,
        last_pricing_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingModel) {
        // Update existing model
        const { error } = await supabaseClient
          .from('model_configurations')
          .update(updateData)
          .eq('id', existingModel.id);

        if (error) {
          results.errors.push(`Failed to update ${model.model_name}: ${error.message}`);
        }
      } else {
        // Insert new model
        const { error } = await supabaseClient
          .from('model_configurations')
          .insert({
            ...updateData,
            is_globally_enabled: true,
            default_monthly_limit: 20.00,
            display_order: 0
          });

        if (error) {
          results.errors.push(`Failed to insert ${model.model_name}: ${error.message}`);
        } else {
          results.new_models.push(model);
        }
      }
    }

    // Mark models as deprecated if they're not in the fetched list
    const fetchedModelKeys = results.updated_models.map(m => `${m.provider}:${m.model_name}`);
    const modelsToDeprecate = currentModels?.filter(m => 
      !fetchedModelKeys.includes(`${m.provider}:${m.model_name}`) && 
      !m.is_deprecated &&
      m.pricing_source !== 'manual'
    ) || [];

    for (const model of modelsToDeprecate) {
      const { error } = await supabaseClient
        .from('model_configurations')
        .update({ 
          is_deprecated: true, 
          api_availability: 'deprecated',
          last_pricing_update: new Date().toISOString() 
        })
        .eq('id', model.id);

      if (!error) {
        results.deprecated_models.push(`${model.provider}:${model.model_name}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      summary: {
        total_updated: results.updated_models.length,
        new_models_added: results.new_models.length,
        models_deprecated: results.deprecated_models.length,
        errors_count: results.errors.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in update-model-pricing function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
