public without sharing class DonorPortalController {

    /**
     * Retrieves all active donor campaigns with their program details & funding progress
     */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getActiveCampaigns() {
        List<Map<String, Object>> results = new List<Map<String, Object>>();
        try {
            List<Donor_Campaign__c> campaigns = [
                SELECT Id, Name, Description__c, Expected_Revenue_in_Campaign__c,
                       Total_Raised__c, Total_Donors_Count__c, Start_Date__c, End_Date__c,
                       Type__c, Status__c, Program__c, Program__r.Name, Program__r.Program_Type__c
                FROM Donor_Campaign__c
                WHERE Active__c = true
                ORDER BY CreatedDate DESC
            ];

            for (Donor_Campaign__c c : campaigns) {
                Decimal goal = c.Expected_Revenue_in_Campaign__c != null ? c.Expected_Revenue_in_Campaign__c : 0;
                Decimal raised = c.Total_Raised__c != null ? c.Total_Raised__c : 0;
                Integer donors = c.Total_Donors_Count__c != null ? Integer.valueOf(c.Total_Donors_Count__c) : 0;
                Decimal progress = goal > 0 ? ((raised / goal) * 100).setScale(1) : 0;
                if (progress > 100) progress = 100;

                Map<String, Object> row = new Map<String, Object>{
                    'id' => c.Id,
                    'name' => c.Name,
                    'description' => c.Description__c,
                    'goalAmount' => goal,
                    'raisedAmount' => raised,
                    'donorCount' => donors,
                    'progressPercent' => progress,
                    'startDate' => c.Start_Date__c,
                    'endDate' => c.End_Date__c,
                    'type' => c.Type__c,
                    'status' => c.Status__c,
                    'programId' => c.Program__c,
                    'programName' => c.Program__r != null ? c.Program__r.Name : 'General Initiative',
                    'programType' => c.Program__r != null ? c.Program__r.Program_Type__c : ''
                };
                results.add(row);
            }
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in getActiveCampaigns: ' + e.getMessage());
        }
        return results;
    }

    /**
     * Retrieves single campaign details with recent supporter wall
     */
    @AuraEnabled
    public static Map<String, Object> getCampaignDetails(Id campaignId) {
        Map<String, Object> response = new Map<String, Object>();
        if (campaignId == null) return response;

        try {
            Donor_Campaign__c c = [
                SELECT Id, Name, Description__c, Expected_Revenue_in_Campaign__c,
                       Total_Raised__c, Total_Donors_Count__c, Start_Date__c, End_Date__c,
                       Type__c, Status__c, Program__c, Program__r.Name, Program__r.Program_Type__c,
                       Program__r.Overview__c
                FROM Donor_Campaign__c
                WHERE Id = :campaignId
                LIMIT 1
            ];

            Decimal goal = c.Expected_Revenue_in_Campaign__c != null ? c.Expected_Revenue_in_Campaign__c : 0;
            Decimal raised = c.Total_Raised__c != null ? c.Total_Raised__c : 0;
            Integer donors = c.Total_Donors_Count__c != null ? Integer.valueOf(c.Total_Donors_Count__c) : 0;
            Decimal progress = goal > 0 ? ((raised / goal) * 100).setScale(1) : 0;
            if (progress > 100) progress = 100;

            // Fetch recent public donations
            List<Donations__c> recentDonations = [
                SELECT Id, Donor_Name__c, Donation_Amount__c, Payment_Date__c, Donor_Message__c
                FROM Donations__c
                WHERE Donor_Campaign__c = :campaignId AND Payment_Status__c = 'Paid'
                ORDER BY Payment_Date__c DESC
                LIMIT 10
            ];

            List<Map<String, Object>> supporterList = new List<Map<String, Object>>();
            for (Donations__c d : recentDonations) {
                supporterList.add(new Map<String, Object>{
                    'donorName' => String.isNotBlank(d.Donor_Name__c) ? d.Donor_Name__c : 'Anonymous Donor',
                    'amount' => d.Donation_Amount__c,
                    'date' => d.Payment_Date__c,
                    'message' => d.Donor_Message__c
                });
            }

            response.put('campaign', new Map<String, Object>{
                'id' => c.Id,
                'name' => c.Name,
                'description' => c.Description__c,
                'goalAmount' => goal,
                'raisedAmount' => raised,
                'donorCount' => donors,
                'progressPercent' => progress,
                'startDate' => c.Start_Date__c,
                'endDate' => c.End_Date__c,
                'type' => c.Type__c,
                'status' => c.Status__c,
                'programId' => c.Program__c,
                'programName' => c.Program__r != null ? c.Program__r.Name : 'General Initiative',
                'programOverview' => c.Program__r != null ? c.Program__r.Overview__c : ''
            });
            response.put('recentDonations', supporterList);
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in getCampaignDetails: ' + e.getMessage());
            response.put('error', e.getMessage());
        }
        return response;
    }

    /**
     * Processes an online donation, generates receipt, and inserts record
     */
    @AuraEnabled
    public static Map<String, Object> submitDonation(Map<String, Object> payload) {
        Map<String, Object> result = new Map<String, Object>();
        try {
            if (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser()) {
                throw new AuraHandledException('Authentication required: You must be signed in to make a donation.');
            }

            if (payload == null) {
                throw new AuraHandledException('Invalid donation payload.');
            }

            Id currentUserId = UserInfo.getUserId();
            List<Donor__c> donors = [
                SELECT Id, Donor_Name__c, Compliance_Status__c, KYC_Verified__c 
                FROM Donor__c 
                WHERE User__c = :currentUserId 
                ORDER BY CreatedDate DESC 
                LIMIT 1
            ];

            if (donors.isEmpty()) {
                throw new AuraHandledException('Verification Profile Required: Please complete your donor profile and KYC verification before making a contribution.');
            }

            Donor__c d = donors[0];
            if (d.Compliance_Status__c != 'Approved' || d.KYC_Verified__c != true) {
                throw new AuraHandledException('Verification Pending: Your donor profile is currently awaiting administrator compliance verification. Donations can only be processed once verified.');
            }

            Id campaignId = (Id)payload.get('campaignId');
            Decimal amount = Decimal.valueOf(String.valueOf(payload.get('amount')));
            String donorName = (String)payload.get('donorName');
            String donorEmail = (String)payload.get('donorEmail');
            String donorPhone = (String)payload.get('donorPhone');
            String donorMessage = (String)payload.get('donorMessage');
            String stripeSessionId = (String)payload.get('stripeSessionId');
            String stripePaymentIntentId = (String)payload.get('stripePaymentIntentId');

            // Generate unique receipt number
            String receiptNum = 'REC-' + String.valueOf(DateTime.now().getTime()).substring(4) + '-' + Math.round(Math.random() * 899 + 100);

            Donations__c donation = new Donations__c(
                Donor__c = d.Id,
                Donor_Campaign__c = campaignId,
                Donation_Amount__c = amount,
                Donor_Name__c = String.isNotBlank(donorName) ? donorName : d.Donor_Name__c,
                Donor_Email__c = donorEmail,
                Donor_Phone__c = donorPhone,
                Donor_Message__c = donorMessage,
                Payment_Date__c = DateTime.now(),
                Payment_Status__c = 'Paid',
                Receipt_Number__c = receiptNum,
                Stripe_Checkout_Session_ID__c = stripeSessionId,
                Stripe_Payment_Intent_ID__c = stripePaymentIntentId
            );

            insert donation;

            // Fetch created record details for confirmation
            Donor_Campaign__c camp = [SELECT Name FROM Donor_Campaign__c WHERE Id = :campaignId LIMIT 1];

            result.put('success', true);
            result.put('donationId', donation.Id);
            result.put('receiptNumber', receiptNum);
            result.put('amount', amount);
            result.put('campaignName', camp.Name);
            result.put('date', donation.Payment_Date__c);
            result.put('donorId', d.Id);

        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error submitting donation: ' + e.getMessage() + '\n' + e.getStackTraceString());
            result.put('success', false);
            result.put('error', e.getMessage());
        }
        return result;
    }

    /**
     * Initiates a real Stripe Checkout Session for online grant donations
     */
    @AuraEnabled
    public static Map<String, Object> createStripeCheckoutSession(Map<String, Object> payload) {
        Map<String, Object> result = new Map<String, Object>();
        try {
            if (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser()) {
                throw new AuraHandledException('Authentication required: You must be signed in to make a donation.');
            }

            if (payload == null) {
                throw new AuraHandledException('Invalid donation payload.');
            }

            Id currentUserId = UserInfo.getUserId();
            User u = [SELECT ContactId, Email FROM User WHERE Id = :currentUserId LIMIT 1];

            List<Donor__c> donors = [
                SELECT Id, Donor_Name__c, Compliance_Status__c, KYC_Verified__c 
                FROM Donor__c 
                WHERE User__c = :currentUserId 
                ORDER BY CreatedDate DESC 
                LIMIT 1
            ];

            if (donors.isEmpty() && u.ContactId != null) {
                donors = [
                    SELECT Id, Donor_Name__c, Compliance_Status__c, KYC_Verified__c 
                    FROM Donor__c 
                    WHERE Contact__c = :u.ContactId 
                    ORDER BY CreatedDate DESC 
                    LIMIT 1
                ];
            }

            if (donors.isEmpty() && String.isNotBlank(u.Email)) {
                donors = [
                    SELECT Id, Donor_Name__c, Compliance_Status__c, KYC_Verified__c 
                    FROM Donor__c 
                    WHERE Email__c = :u.Email 
                    ORDER BY CreatedDate DESC 
                    LIMIT 1
                ];
            }

            if (donors.isEmpty()) {
                throw new AuraHandledException('Verification Profile Required: Please complete your donor profile and KYC verification before donating.');
            }

            Donor__c d = donors[0];
            if (d.Compliance_Status__c != 'Approved' || d.KYC_Verified__c != true) {
                throw new AuraHandledException('Verification Pending: Your donor profile is currently awaiting administrator compliance verification. Donations can only be processed once verified.');
            }

            Id campaignId = (Id)payload.get('campaignId');
            Decimal amount = Decimal.valueOf(String.valueOf(payload.get('amount')));
            String donorName = (String)payload.get('donorName');
            String donorEmail = (String)payload.get('donorEmail');
            String donorPhone = (String)payload.get('donorPhone');
            String donorMessage = (String)payload.get('donorMessage');
            String successUrl = (String)payload.get('successUrl');
            String cancelUrl = (String)payload.get('cancelUrl');

            Donor_Campaign__c camp = [SELECT Id, Name, Description__c FROM Donor_Campaign__c WHERE Id = :campaignId LIMIT 1];

            Long amountInCents = Math.round(amount * 100);

            HttpRequest req = new HttpRequest();
            req.setEndpoint('callout:Stripe_API/v1/checkout/sessions');
            req.setMethod('POST');
            req.setHeader('Content-Type', 'application/x-www-form-urlencoded');

            String productName = 'Grant Donation: ' + camp.Name;
            if (productName.length() > 250) productName = productName.substring(0, 247) + '...';

            String formBody = 'payment_method_types[0]=card'
                + '&mode=payment'
                + '&line_items[0][price_data][currency]=usd'
                + '&line_items[0][price_data][unit_amount]=' + amountInCents
                + '&line_items[0][price_data][product_data][name]=' + EncodingUtil.urlEncode(productName, 'UTF-8')
                + '&line_items[0][quantity]=1'
                + '&success_url=' + EncodingUtil.urlEncode(successUrl, 'UTF-8')
                + '&cancel_url=' + EncodingUtil.urlEncode(cancelUrl, 'UTF-8')
                + '&metadata[campaignId]=' + EncodingUtil.urlEncode(String.valueOf(camp.Id), 'UTF-8')
                + '&metadata[campaignName]=' + EncodingUtil.urlEncode(camp.Name, 'UTF-8')
                + '&metadata[donorId]=' + EncodingUtil.urlEncode(String.valueOf(d.Id), 'UTF-8')
                + '&metadata[donorName]=' + EncodingUtil.urlEncode(String.isNotBlank(donorName) ? donorName : d.Donor_Name__c, 'UTF-8')
                + '&metadata[donorEmail]=' + EncodingUtil.urlEncode(String.isNotBlank(donorEmail) ? donorEmail : '', 'UTF-8')
                + '&metadata[donorPhone]=' + EncodingUtil.urlEncode(String.isNotBlank(donorPhone) ? donorPhone : '', 'UTF-8')
                + '&metadata[donorMessage]=' + EncodingUtil.urlEncode(String.isNotBlank(donorMessage) ? donorMessage : '', 'UTF-8');

            if (String.isNotBlank(donorEmail)) {
                formBody += '&customer_email=' + EncodingUtil.urlEncode(donorEmail, 'UTF-8');
            }

            req.setBody(formBody);

            Http http = new Http();
            HttpResponse resp = http.send(req);

            if (resp.getStatusCode() != 200) {
                System.debug(LoggingLevel.ERROR, 'Stripe Checkout Session Error: ' + resp.getBody());
                throw new AuraHandledException('Failed to create Stripe payment session: ' + resp.getBody());
            }

            Map<String, Object> stripeMap = (Map<String, Object>)JSON.deserializeUntyped(resp.getBody());
            String checkoutUrl = (String)stripeMap.get('url');
            String sessionId = (String)stripeMap.get('id');

            result.put('success', true);
            result.put('checkoutUrl', checkoutUrl);
            result.put('sessionId', sessionId);
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error creating Stripe Checkout Session: ' + e.getMessage() + '\n' + e.getStackTraceString());
            result.put('success', false);
            result.put('error', e.getMessage());
        }
        return result;
    }

    /**
     * Confirms a completed Stripe Checkout Session, verifies payment, and generates the Donation + Receipt
     */
    @AuraEnabled
    public static Map<String, Object> confirmStripeDonation(String sessionId) {
        Map<String, Object> result = new Map<String, Object>();
        try {
            if (String.isBlank(sessionId)) {
                throw new AuraHandledException('Session ID is required.');
            }

            // Check if already processed to prevent duplicate insertions
            List<Donations__c> existing = [
                SELECT Id, Receipt_Number__c, Donation_Amount__c, Payment_Date__c,
                       Donor_Campaign__r.Name, Donor_Campaign__r.Program__r.Name,
                       Donor_Name__c, Donor_Email__c
                FROM Donations__c 
                WHERE Stripe_Checkout_Session_ID__c = :sessionId 
                LIMIT 1
            ];

            if (!existing.isEmpty()) {
                Donations__c ex = existing[0];
                result.put('success', true);
                result.put('alreadyProcessed', true);
                result.put('donationId', ex.Id);
                result.put('receiptNumber', ex.Receipt_Number__c);
                result.put('amount', ex.Donation_Amount__c);
                result.put('campaignName', ex.Donor_Campaign__r != null ? ex.Donor_Campaign__r.Name : '');
                result.put('programName', ex.Donor_Campaign__r != null && ex.Donor_Campaign__r.Program__r != null ? ex.Donor_Campaign__r.Program__r.Name : '');
                result.put('donorName', ex.Donor_Name__c);
                result.put('donorEmail', ex.Donor_Email__c);
                result.put('date', ex.Payment_Date__c);
                return result;
            }

            // Retrieve the session from Stripe to verify payment status
            HttpRequest req = new HttpRequest();
            req.setEndpoint('callout:Stripe_API/v1/checkout/sessions/' + sessionId);
            req.setMethod('GET');

            Http http = new Http();
            HttpResponse resp = http.send(req);

            if (resp.getStatusCode() != 200) {
                throw new AuraHandledException('Unable to verify Stripe checkout session: ' + resp.getBody());
            }

            Map<String, Object> sessionMap = (Map<String, Object>)JSON.deserializeUntyped(resp.getBody());
            String paymentStatus = (String)sessionMap.get('payment_status');

            if (paymentStatus != 'paid') {
                result.put('success', false);
                result.put('error', 'Payment status is: ' + paymentStatus + '. The transaction has not been charged yet.');
                return result;
            }

            Decimal amountTotal = Decimal.valueOf(String.valueOf(sessionMap.get('amount_total'))) / 100;
            String paymentIntentId = (String)sessionMap.get('payment_intent');

            Map<String, Object> metadata = (Map<String, Object>)sessionMap.get('metadata');
            Id campaignId = metadata != null && metadata.containsKey('campaignId') ? (Id)metadata.get('campaignId') : null;
            Id donorId = metadata != null && metadata.containsKey('donorId') ? (Id)metadata.get('donorId') : null;
            String donorName = metadata != null ? (String)metadata.get('donorName') : 'Supporter';
            String donorEmail = metadata != null ? (String)metadata.get('donorEmail') : '';
            String donorPhone = metadata != null ? (String)metadata.get('donorPhone') : '';
            String donorMessage = metadata != null ? (String)metadata.get('donorMessage') : '';

            // Generate unique receipt number
            String receiptNum = 'REC-' + String.valueOf(DateTime.now().getTime()).substring(4) + '-' + Math.round(Math.random() * 899 + 100);

            Donations__c donation = new Donations__c(
                Donor__c = donorId,
                Donor_Campaign__c = campaignId,
                Donation_Amount__c = amountTotal,
                Donor_Name__c = donorName,
                Donor_Email__c = donorEmail,
                Donor_Phone__c = donorPhone,
                Donor_Message__c = donorMessage,
                Payment_Date__c = DateTime.now(),
                Payment_Status__c = 'Paid',
                Receipt_Number__c = receiptNum,
                Stripe_Checkout_Session_ID__c = sessionId,
                Stripe_Payment_Intent_ID__c = paymentIntentId
            );

            insert donation;

            Donor_Campaign__c camp = campaignId != null ? [SELECT Name, Program__r.Name FROM Donor_Campaign__c WHERE Id = :campaignId LIMIT 1] : null;

            result.put('success', true);
            result.put('alreadyProcessed', false);
            result.put('donationId', donation.Id);
            result.put('receiptNumber', receiptNum);
            result.put('amount', amountTotal);
            result.put('campaignName', camp != null ? camp.Name : '');
            result.put('programName', camp != null && camp.Program__r != null ? camp.Program__r.Name : '');
            result.put('donorName', donorName);
            result.put('donorEmail', donorEmail);
            result.put('date', donation.Payment_Date__c);

        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error confirming Stripe donation: ' + e.getMessage() + '\n' + e.getStackTraceString());
            result.put('success', false);
            result.put('error', e.getMessage());
        }
        return result;
    }

    /**
     * Submits a corporate / major sponsor inquiry, creating a Salesforce Lead
     */
    @AuraEnabled
    public static Map<String, Object> submitLeadInquiry(Map<String, Object> payload) {
        Map<String, Object> result = new Map<String, Object>();
        try {
            String firstName = (String)payload.get('firstName');
            String lastName = (String)payload.get('lastName');
            String company = (String)payload.get('company');
            String email = (String)payload.get('email');
            String phone = (String)payload.get('phone');
            String message = (String)payload.get('message');
            String campaignName = (String)payload.get('campaignName');
            String estimatedPledge = (String)payload.get('estimatedPledge');

            if (String.isBlank(lastName)) lastName = 'Pledge Prospect';
            if (String.isBlank(company)) company = 'Individual Philanthropist';

            // Ensure portal leads are owned by an active internal Administrator
            // so they can be converted to Accounts/Contacts without Community User ownership restrictions
            List<User> internalAdmins = [
                SELECT Id FROM User 
                WHERE Profile.Name = 'System Administrator' AND IsActive = true 
                ORDER BY CreatedDate ASC 
                LIMIT 1
            ];
            Id defaultOwnerId = !internalAdmins.isEmpty() ? internalAdmins[0].Id : null;

            Lead sponsorLead = new Lead(
                FirstName = firstName,
                LastName = lastName,
                Company = company,
                Email = email,
                Phone = phone,
                LeadSource = 'Donor Site',
                Description = 'Campaign Inquiry: ' + campaignName + 
                              '\nEstimated Pledge: ' + estimatedPledge + 
                              '\nMessage: ' + message
            );
            if (defaultOwnerId != null) {
                sponsorLead.OwnerId = defaultOwnerId;
            }

            insert sponsorLead;

            result.put('success', true);
            result.put('leadId', sponsorLead.Id);
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error creating lead: ' + e.getMessage());
            result.put('success', false);
            result.put('error', e.getMessage());
        }
        return result;
    }

    /**
     * High-level donor platform stats for the hero banner
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getDonorPlatformStats() {
        Map<String, Object> stats = new Map<String, Object>();
        try {
            Integer activeCampaigns = [SELECT count() FROM Donor_Campaign__c WHERE Active__c = true];

            AggregateResult[] ar = [
                SELECT SUM(Donation_Amount__c) totalRaised, COUNT_DISTINCT(Donor_Email__c) uniqueDonors
                FROM Donations__c
                WHERE Payment_Status__c = 'Paid'
            ];

            Decimal totalRaised = 0;
            Integer uniqueDonors = 0;
            if (ar != null && !ar.isEmpty()) {
                if (ar[0].get('totalRaised') != null) totalRaised = (Decimal)ar[0].get('totalRaised');
                if (ar[0].get('uniqueDonors') != null) uniqueDonors = (Integer)ar[0].get('uniqueDonors');
            }

            Integer programsCount = [SELECT count() FROM Program__c];

            stats.put('activeCampaigns', activeCampaigns);
            stats.put('totalRaised', totalRaised);
            stats.put('uniqueDonors', uniqueDonors);
            stats.put('programsCount', programsCount);
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in getDonorPlatformStats: ' + e.getMessage());
            stats.put('activeCampaigns', 0);
            stats.put('totalRaised', 0);
            stats.put('uniqueDonors', 0);
            stats.put('programsCount', 0);
        }
        return stats;
    }

    /**
     * Retrieves the current user's Donor profile and verification compliance status
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getDonorProfileStatus() {
        Map<String, Object> res = new Map<String, Object>();
        try {
            if (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser()) {
                res.put('isLoggedIn', false);
                res.put('status', 'GUEST');
                return res;
            }

            res.put('isLoggedIn', true);
            Id currentUserId = UserInfo.getUserId();
            User u = [SELECT Name, Email, Phone, ContactId FROM User WHERE Id = :currentUserId LIMIT 1];
            res.put('userName', u.Name);
            res.put('userEmail', u.Email);

            List<Donor__c> donors = [
                SELECT Id, Name, Donor_Name__c, Donor_Type__c, Email__c, Contact_Number__c,
                       Address__c, Compliance_Status__c, KYC_Verified__c, Status__c,
                       Preferred_Funding_Type__c, Funding_Capacity__c, User__c
                FROM Donor__c 
                WHERE User__c = :currentUserId 
                ORDER BY CreatedDate DESC 
                LIMIT 1
            ];

            if (donors.isEmpty() && u.ContactId != null) {
                donors = [
                    SELECT Id, Name, Donor_Name__c, Donor_Type__c, Email__c, Contact_Number__c,
                           Address__c, Compliance_Status__c, KYC_Verified__c, Status__c,
                           Preferred_Funding_Type__c, Funding_Capacity__c, User__c
                    FROM Donor__c 
                    WHERE Contact__c = :u.ContactId 
                    ORDER BY CreatedDate DESC 
                    LIMIT 1
                ];
            }

            if (donors.isEmpty() && String.isNotBlank(u.Email)) {
                donors = [
                    SELECT Id, Name, Donor_Name__c, Donor_Type__c, Email__c, Contact_Number__c,
                           Address__c, Compliance_Status__c, KYC_Verified__c, Status__c,
                           Preferred_Funding_Type__c, Funding_Capacity__c, User__c
                    FROM Donor__c 
                    WHERE Email__c = :u.Email 
                    ORDER BY CreatedDate DESC 
                    LIMIT 1
                ];
            }

            if (donors.isEmpty()) {
                res.put('status', 'NO_PROFILE');
                return res;
            }

            if (donors[0].User__c == null) {
                donors[0].User__c = currentUserId;
                try {
                    update donors[0];
                } catch (Exception ex) {
                    System.debug(LoggingLevel.WARN, 'Could not auto-link donor User__c: ' + ex.getMessage());
                }
            }

            Donor__c d = donors[0];
            Boolean isKycDone = (d.KYC_Verified__c == true);
            String compStatus = String.isNotBlank(d.Compliance_Status__c) ? d.Compliance_Status__c : 'Pending';

            // Profile is only considered Approved if both Compliance Status is Approved AND KYC_Verified is checked by Admin
            String effectiveStatus = (compStatus == 'Approved' && isKycDone) ? 'Approved' : (compStatus == 'Rejected' ? 'Rejected' : 'Pending');

            res.put('status', effectiveStatus);
            res.put('complianceStatus', compStatus);
            res.put('kycVerified', isKycDone);
            res.put('donorId', d.Id);
            res.put('donorCode', d.Name);
            res.put('donorName', d.Donor_Name__c);
            res.put('donorType', d.Donor_Type__c);
            res.put('email', d.Email__c);
            res.put('phone', d.Contact_Number__c);
            res.put('address', d.Address__c);
            res.put('preferredFundingType', d.Preferred_Funding_Type__c);
            res.put('fundingCapacity', d.Funding_Capacity__c);
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in getDonorProfileStatus: ' + e.getMessage());
            res.put('status', 'NO_PROFILE');
            res.put('error', e.getMessage());
        }
        return res;
    }

    /**
     * Submits or updates the donor's verification & KYC profile
     */
    @AuraEnabled
    public static Map<String, Object> submitDonorProfile(Map<String, Object> payload) {
        Map<String, Object> res = new Map<String, Object>();
        try {
            if (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser()) {
                throw new AuraHandledException('Authentication required to submit donor verification profile.');
            }

            if (payload == null) {
                throw new AuraHandledException('Invalid profile payload.');
            }

            Id currentUserId = UserInfo.getUserId();
            String donorName = (String)payload.get('donorName');
            String donorType = (String)payload.get('donorType');
            String email = (String)payload.get('email');
            String phone = (String)payload.get('phone');
            String address = (String)payload.get('address');
            String preferredFundingType = (String)payload.get('preferredFundingType');
            Decimal fundingCapacity = payload.get('fundingCapacity') != null ? Decimal.valueOf(String.valueOf(payload.get('fundingCapacity'))) : null;

            List<Donor__c> existing = [
                SELECT Id 
                FROM Donor__c 
                WHERE User__c = :currentUserId 
                ORDER BY CreatedDate DESC 
                LIMIT 1
            ];

            Donor__c d;
            if (!existing.isEmpty()) {
                d = existing[0];
            } else {
                d = new Donor__c(
                    User__c = currentUserId,
                    Status__c = 'Active'
                );
            }

            d.Donor_Name__c = donorName;
            d.Donor_Type__c = String.isNotBlank(donorType) ? donorType : 'Individual';
            d.Email__c = email;
            d.Contact_Number__c = phone;
            d.Address__c = address;
            d.Preferred_Funding_Type__c = String.isNotBlank(preferredFundingType) ? preferredFundingType : 'Earmarked';
            if (fundingCapacity != null) {
                d.Funding_Capacity__c = fundingCapacity;
            }
            d.Compliance_Status__c = 'Pending';
            d.KYC_Verified__c = false;

            if (d.Id != null) {
                update d;
            } else {
                insert d;
            }

            res.put('success', true);
            res.put('donorId', d.Id);
            res.put('status', 'Pending');
            res.put('complianceStatus', 'Pending');
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in submitDonorProfile: ' + e.getMessage());
            res.put('success', false);
            res.put('error', e.getMessage());
        }
        return res;
    }
}
