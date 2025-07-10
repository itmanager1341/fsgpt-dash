-- Insert the Marketing Campaign Brief Template - Conference Events
-- Using auth.uid() to get the current user creating the template
INSERT INTO public.knowledge_items (
  user_id,
  title,
  description,
  content_type,
  category,
  classification_level,
  processing_status,
  metadata,
  tags
) VALUES (
  auth.uid(), -- Current authenticated user
  'Marketing Campaign Brief Template - Conference Events',
  'Comprehensive multi-track conference marketing campaign brief template with sections for sponsor acquisition, speaker recruitment, and attendee registration campaigns.',
  'template',
  'company_resources',
  'public',
  'completed',
  jsonb_build_object(
    'template_content', '# Marketing Campaign Brief Template - Conference Events

**Campaign Type:** Multi-Track Conference Marketing Campaign  
**Template Version:** 1.0  
**Date Created:** [Campaign Start Date]  
**Last Updated:** [Date]  

---

## 1. CAMPAIGN OVERVIEW & OBJECTIVES

### Primary Campaign Goal
- **Main Objective:** [Define primary campaign goal]
- **Campaign Duration:** [Timeline - e.g., 90-day sprint]
- **Launch Date:** [Campaign start date]
- **Key Deadline:** [Registration deadline/Event date]

### Multi-Track Campaign Structure
**Track 1: Sponsor Acquisition Campaign**
- **Goal:** [Number of sponsors to secure]
- **Target Audience:** [Industry service providers, technology companies, etc.]
- **Revenue Target:** [$Sponsorship revenue goal]

**Track 2: Speaker Recruitment Campaign** 
- **Goal:** [Number of speakers to confirm]
- **Target Audience:** [Industry thought leaders, executives, experts]
- **Secondary Goal:** [Convert speaker companies into sponsors]

**Track 3: Attendee Registration Campaign**
- **Goal:** [Number of paid registrations]
- **Target Audience:** [Primary conference audience segments]
- **Revenue Target:** [$Registration revenue goal]

---

## 2. DISTRIBUTION GROUPS & AUDIENCE SEGMENTATION

### Track 1: Sponsor Acquisition Targets
**Primary Sponsor Prospects:**
- **[Industry Category 1]:** [e.g., Technology Companies]
  - List size: [Number of prospects]
  - Decision makers: [Titles - CMO, VP Marketing, Business Development]
  - Value proposition: [What sponsors gain from partnership]

- **[Industry Category 2]:** [e.g., Financial Services]
  - List size: [Number of prospects]
  - Decision makers: [Titles and roles]
  - Value proposition: [Sponsor benefits and ROI]

- **[Industry Category 3]:** [e.g., Service Providers]
  - List size: [Number of prospects]
  - Decision makers: [Target contacts]
  - Value proposition: [Partnership value]

### Track 2: Speaker Recruitment Targets
**Target Speaker Categories:**
- **[Speaker Type 1]:** [e.g., Industry Practitioners]
  - List source: [Where to find these speakers]
  - Outreach angle: [Why they should speak]
  - Conversion to sponsor: [How speaking leads to sponsorship]

- **[Speaker Type 2]:** [e.g., Company Executives]
  - List source: [Professional networks, publications]
  - Outreach angle: [Value proposition for speaking]
  - Conversion to sponsor: [Corporate partnership opportunities]

- **[Speaker Type 3]:** [e.g., Subject Matter Experts]
  - List source: [Industry publications, associations]
  - Outreach angle: [Platform and audience reach]
  - Conversion to sponsor: [Business development opportunities]

### Track 3: Attendee Registration Targets
**Primary Registration Audiences:**
- **[Audience Segment 1]:**
  - List size: [Estimated reachable audience]
  - Sources: [Where to reach this audience]
  - Pain points: [What challenges they face]
  - Value proposition: [Why they should attend]

- **[Audience Segment 2]:**
  - List size: [Estimated reachable audience]
  - Sources: [Audience acquisition channels]
  - Pain points: [Problems conference solves]
  - Value proposition: [Conference benefits]

- **[Audience Segment 3]:**
  - List size: [Estimated reachable audience]
  - Sources: [Marketing channels and platforms]
  - Pain points: [Key challenges addressed]
  - Value proposition: [Attendance value]

---

## 3. MARKETING CHANNEL STRATEGY BY TRACK

### Email Marketing Campaigns
**Track 1 - Sponsor Outreach:**
- **Sequence:** [Number of emails over timeframe]
- **Messaging themes:** [Key messages for sponsors]
- **Personalization:** [How to customize for prospects]
- **Call-to-action:** [Desired sponsor action]

**Track 2 - Speaker Recruitment:**
- **Sequence:** [Email series structure and timing]
- **Messaging themes:** [Speaker value propositions]
- **Personalization:** [Speaker-specific customization]
- **Call-to-action:** [Speaking opportunity response]

**Track 3 - Registration Drive:**
- **Sequence:** [Registration nurture campaign structure]
- **Messaging themes:** [Attendee-focused messaging]
- **Segmentation:** [How to segment attendee audiences]
- **Call-to-action:** [Registration conversion goals]

### Social Media Campaigns
**LinkedIn Strategy:**
- **Sponsor Track:** [B2B targeting and messaging approach]
- **Speaker Track:** [Professional outreach strategy]
- **Registration Track:** [Industry group engagement]

**Facebook Strategy:**
- **Sponsor Track:** [Company page targeting]
- **Speaker Track:** [Professional network outreach]
- **Registration Track:** [Community and group marketing]

**Twitter/X Strategy:**
- **Sponsor Track:** [Industry hashtag engagement]
- **Speaker Track:** [Thought leader connections]
- **Registration Track:** [Community engagement]

**YouTube/Podcast Strategy:**
- **Sponsor Track:** [Advertising on industry content]
- **Speaker Track:** [Content collaboration opportunities]
- **Registration Track:** [Educational content marketing]

### Direct Outreach Campaigns
**Phone & Voicemail Campaigns:**
- **Sponsor Track:** [Direct sales approach]
- **Speaker Track:** [Personal recruitment calls]
- **Registration Track:** [VIP invitation calls]

### Paid Advertising Campaigns
**Google PPC:**
- **Sponsor Track:** [Keywords: industry-specific terms]
- **Speaker Track:** [Keywords: speaking opportunities]
- **Registration Track:** [Keywords: conference and event terms]

**LinkedIn Ads:**
- **Sponsor Track:** [B2B decision maker targeting]
- **Speaker Track:** [Industry executive targeting]
- **Registration Track:** [Professional audience targeting]

**Facebook/Instagram Ads:**
- **Sponsor Track:** [Company audience targeting]
- **Speaker Track:** [Professional interest targeting]
- **Registration Track:** [Event promotion audiences]

---

## 4. MESSAGING FRAMEWORK BY CAMPAIGN TRACK

### Track 1: Sponsor Acquisition Messaging
**Primary Value Propositions:**
- **Lead Generation:** [Access to qualified audience]
- **Thought Leadership:** [Industry positioning opportunities]
- **Brand Visibility:** [Conference marketing reach]
- **ROI Focus:** [Measurable partnership benefits]

**Key Messages by Channel:**
- **Email:** [Primary sponsor email messaging]
- **LinkedIn:** [Professional platform messaging]
- **Phone:** [Direct conversation talking points]

### Track 2: Speaker Recruitment Messaging
**Primary Value Propositions:**
- **Audience Reach:** [Platform to share expertise]
- **Business Promotion:** [Company and service visibility]
- **Industry Recognition:** [Professional credibility building]
- **Content Distribution:** [Content marketing opportunities]

**Key Messages by Channel:**
- **Email:** [Speaker invitation messaging]
- **LinkedIn:** [Professional speaking opportunity]
- **Direct Outreach:** [Personal invitation approach]

### Track 3: Registration Drive Messaging
**Primary Value Propositions:**
- **Education Excellence:** [Learning and skill development]
- **Networking Power:** [Professional connections]
- **Access:** [Exclusive opportunities and content]
- **Career Advancement:** [Professional growth benefits]

**Key Messages by Channel:**
- **Email:** [Registration-focused messaging]
- **Social Media:** [Community engagement messaging]
- **Paid Ads:** [Conversion-optimized messaging]

---

## 5. CAMPAIGN TIMELINE & COORDINATION

### Phase 1: Foundation (Days 1-30)
**Sponsor Track:**
- [Initial sponsor outreach activities]
- [Prospect research and qualification]
- [Sponsorship package development]

**Speaker Track:**
- [Speaker research and identification]
- [Initial speaking invitations]
- [Speaker package creation]

**Registration Track:**
- [Early promotion launch]
- [Audience development]
- [Content creation initiation]

### Phase 2: Acceleration (Days 31-60)
**Sponsor Track:**
- [Follow-up campaigns and negotiations]
- [Sponsor onboarding processes]
- [Partnership development]

**Speaker Track:**
- [Speaker confirmation processes]
- [Content development with speakers]
- [Speaker promotion campaigns]

**Registration Track:**
- [Main registration drive]
- [Social proof development]
- [Conversion optimization]

### Phase 3: Conversion (Days 61-90)
**Sponsor Track:**
- [Final sponsor acquisitions]
- [Sponsor activation]
- [Partnership execution]

**Speaker Track:**
- [Final speaker confirmations]
- [Speaker promotion intensification]
- [Content finalization]

**Registration Track:**
- [Urgency messaging]
- [Final conversion push]
- [Last-chance promotions]

---

## 6. CAMPAIGN INTEGRATION & CROSS-PROMOTION

### Cross-Track Opportunities
**Speaker-to-Sponsor Conversion:**
- **Strategy:** [How speaking opportunities convert to sponsorships]
- **Messaging:** [Upgrade value propositions]
- **Timeline:** [Conversion opportunity windows]

**Sponsor-Driven Registration:**
- **Strategy:** [Leveraging sponsor networks for attendees]
- **Messaging:** [Sponsor-endorsed promotion]
- **Implementation:** [Joint promotional activities]

**Speaker-Driven Registration:**
- **Strategy:** [Using speakers to drive registrations]
- **Messaging:** [Speaker-focused promotion]
- **Implementation:** [Speaker spotlight campaigns]

### Unified Campaign Elements
**Consistent Branding:** [Brand guidelines across campaigns]
**Coordinated Timing:** [Synchronized messaging schedule]
**Shared Content:** [Core messaging adapted per audience]
**Integrated Metrics:** [Cross-campaign performance tracking]

---

## 7. PERFORMANCE METRICS & SUCCESS TRACKING

### Track 1: Sponsor Acquisition Metrics
- **Outreach Volume:** [Activity metrics to track]
- **Response Rates:** [Engagement measurements]
- **Conversion Rates:** [Success ratios]
- **Revenue Tracking:** [Financial performance indicators]

### Track 2: Speaker Recruitment Metrics
- **Outreach Volume:** [Speaker invitation metrics]
- **Response Rates:** [Interest and application rates]
- **Conversion Rates:** [Confirmation percentages]
- **Secondary Conversions:** [Speaker-to-sponsor conversion]

### Track 3: Registration Campaign Metrics
- **Audience Reach:** [Marketing reach measurements]
- **Engagement Rates:** [Content engagement metrics]
- **Conversion Rates:** [Registration success rates]
- **Revenue Tracking:** [Registration revenue performance]

### Integrated Campaign Analytics
- **Cross-Track Performance:** [How campaigns support each other]
- **Channel Effectiveness:** [ROI by marketing channel]
- **Timeline Performance:** [Campaign phase analysis]
- **Overall ROI:** [Total campaign return on investment]

---

## 8. BUDGET ALLOCATION BY TRACK AND CHANNEL

### Track 1: Sponsor Acquisition Budget
- **Email Marketing:** [Budget allocation]
- **LinkedIn Advertising:** [Paid promotion budget]
- **Direct Outreach:** [Sales activity costs]
- **Content Creation:** [Marketing materials budget]

### Track 2: Speaker Recruitment Budget
- **Outreach Campaigns:** [Speaker marketing costs]
- **Content Development:** [Speaker-related materials]
- **Travel/Accommodation:** [Speaker support budget]
- **Promotion:** [Speaker marketing campaigns]

### Track 3: Registration Drive Budget
- **Email Marketing:** [Registration campaign costs]
- **Social Media Advertising:** [Paid social promotion]
- **PPC Advertising:** [Search and display advertising]
- **Content Creation:** [Registration marketing materials]
- **Influencer/Partnership:** [Collaboration costs]

### Total Campaign Budget
- **Overall Budget:** [$Total marketing investment]
- **Expected ROI:** [Revenue to investment ratio]
- **Break-even Analysis:** [Minimum performance requirements]

---

## 9. RISK ASSESSMENT & CONTINGENCY PLANS

### Campaign-Specific Risks
**Track 1 Risks:**
- **[Risk Type]:** [Specific sponsor acquisition challenges]
- **Mitigation:** [Risk reduction strategies]

**Track 2 Risks:**
- **[Risk Type]:** [Speaker recruitment challenges]
- **Mitigation:** [Risk management approaches]

**Track 3 Risks:**
- **[Risk Type]:** [Registration campaign challenges]
- **Mitigation:** [Contingency strategies]

### Integrated Risk Management
- **Campaign Coordination Risks:** [Cross-campaign challenges]
- **Resource Allocation:** [Budget and team risks]
- **Performance Monitoring:** [Early warning systems]

---

## 10. SUCCESS CRITERIA & CAMPAIGN EVALUATION

### Minimum Success Thresholds
**Track 1:** [Minimum sponsor requirements]
**Track 2:** [Minimum speaker requirements]
**Track 3:** [Minimum registration requirements]

### Optimal Success Targets
**Track 1:** [Target sponsor performance]
**Track 2:** [Target speaker lineup]
**Track 3:** [Target registration numbers]

### Post-Campaign Analysis Framework
- **Performance Review:** [Analysis methodology]
- **ROI Analysis:** [Financial performance evaluation]
- **Audience Feedback:** [Stakeholder satisfaction measurement]
- **Future Recommendations:** [Strategic improvements]

---

## 11. CAMPAIGN ASSETS & RESOURCES NEEDED

### Content Assets Required
**Track 1:** [Sponsor-focused materials needed]
**Track 2:** [Speaker-focused materials needed]
**Track 3:** [Registration-focused materials needed]

### Technology Requirements
- **CRM System:** [Customer relationship management needs]
- **Email Platform:** [Email marketing requirements]
- **Social Media Tools:** [Social media management needs]
- **Analytics Platform:** [Performance tracking requirements]

### Team Resources
- **Campaign Manager:** [Overall coordination role]
- **Track Specialists:** [Dedicated track management]
- **Content Creator:** [Content development role]
- **Data Analyst:** [Performance analysis role]

---

**Campaign Brief Completion Instructions:**
1. **Replace all bracketed placeholders** with specific campaign information
2. **Upload supporting documents** to campaign project folder
3. **Review and approve** strategy with stakeholders
4. **Submit completed brief** for AI framework generation

**Next Steps After Brief Completion:**
1. **AI will generate Marketing Framework** with detailed tactics
2. **Content Calendar will be created** with coordinated messaging
3. **Campaign execution begins** with performance tracking

---

*This generic template should be customized for specific conference campaigns. Complete all bracketed sections with campaign-specific details before submitting for AI framework generation.*',
    'template_type', 'campaign-brief',
    'instructions', 'Replace all bracketed placeholders with specific campaign information. Use this template to create comprehensive multi-track conference marketing campaigns.',
    'sections', jsonb_build_array(
      'Campaign Overview & Objectives',
      'Distribution Groups & Audience Segmentation', 
      'Marketing Channel Strategy by Track',
      'Messaging Framework by Campaign Track',
      'Campaign Timeline & Coordination',
      'Campaign Integration & Cross-Promotion',
      'Performance Metrics & Success Tracking',
      'Budget Allocation by Track and Channel',
      'Risk Assessment & Contingency Plans',
      'Success Criteria & Campaign Evaluation',
      'Campaign Assets & Resources Needed'
    )
  ),
  ARRAY['campaign-brief', 'template', 'conference-marketing', 'multi-track', 'sponsor-acquisition', 'speaker-recruitment', 'attendee-registration']
);