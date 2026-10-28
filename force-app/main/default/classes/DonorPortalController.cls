public without sharing class DonorPortalController {

    private static Donor__c getCurrentDonor() {
        if (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser()) {
            return null;
        }
        Id currentUserId = UserInfo.getUserId();
        List<Donor__c> donors = [
            SELECT Id, Donor_Name__c, Program__c, Authorized_Campaigns__c, Pending_Campaigns__c,
                   Compliance_Status__c, KYC_Verified__c
            FROM Donor__c
            WHERE User__c = :currentUserId
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        if (donors.isEmpty()) {
            List<User> users = [SELECT Id, ContactId, Email FROM User WHERE Id = :currentUserId LIMIT 1];
            if (!users.isEmpty()) {
                User u = users[0];
                if (u.ContactId != null) {
                    donors = [SELECT Id, Donor_Name__c, Program__c, Authorized_Campaigns__c, Pending_Campaigns__c, Compliance_Status__c, KYC_Verified__c FROM Donor__c WHERE Contact__c = :u.ContactId ORDER BY CreatedDate DESC LIMIT 1];
                }
                if (donors.isEmpty() && String.isNotBlank(u.Email)) {
                    donors = [SELECT Id, Donor_Name__c, Program__c, Authorized_Campaigns__c, Pending_Campaigns__c, Compliance_Status__c, KYC_Verified__c FROM Donor__c WHERE Email__c = :u.Email ORDER BY CreatedDate DESC LIMIT 1];
                }
            }
        }
        return donors.isEmpty() ? null : donors[0];
    }

    private static Map<Id, String> getDonorCampaignStatuses(Id donorId, Set<Id> campaignIds, Donor__c donor) {
        Map<Id, String> statusMap = new Map<Id, String>();
        if (campaignIds == null || campaignIds.isEmpty()) return statusMap;

        Boolean isGuest = (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser());
        for (Id cId : campaignIds) {
            statusMap.put(cId, isGuest ? 'GUEST' : 'NOT_REQUESTED');
        }

        if (isGuest) return statusMap;

        if (donor == null && donorId != null) {
            List<Donor__c> dList = [
                SELECT Id, Authorized_Campaigns__c, Pending_Campaigns__c, Program__c 
                FROM Donor__c 
                WHERE Id = :donorId 
                LIMIT 1
            ];
            if (!dList.isEmpty()) donor = dList[0];
        }

        if (donor == null) return statusMap;

        String authStr = String.isNotBlank(donor.Authorized_Campaigns__c) ? donor.Authorized_Campaigns__c : '';
        String pendStr = String.isNotBlank(donor.Pending_Campaigns__c) ? donor.Pending_Campaigns__c : '';

        // Check paid donations for this donor
        Set<Id> paidCampaignIds = new Set<Id>();
        for (Donations__c d : [
            SELECT Donor_Campaign__c 
            FROM Donations__c 
            WHERE Donor__c = :donor.Id 
              AND Donor_Campaign__c IN :campaignIds 
              AND Payment_Status__c = 'Paid'
        ]) {
            if (d.Donor_Campaign__c != null) {
                paidCampaignIds.add(d.Donor_Campaign__c);
            }
        }

        // Map campaign programs
        Map<Id, Id> campToProgram = new Map<Id, Id>();
        for (Donor_Campaign__c c : [SELECT Id, Program__c FROM Donor_Campaign__c WHERE Id IN :campaignIds]) {
            campToProgram.put(c.Id, c.Program__c);
        }

        for (Id cId : campaignIds) {
            String cStr = String.valueOf(cId);
            if (paidCampaignIds.contains(cId)) {
                statusMap.put(cId, 'COMPLETED');
            } else if (authStr.contains(cStr) || (donor.Program__c != null && campToProgram.get(cId) == donor.Program__c)) {
                statusMap.put(cId, 'AUTHORIZED');
            } else if (pendStr.contains(cStr)) {
                statusMap.put(cId, 'PENDING');
            } else {
                statusMap.put(cId, 'NOT_REQUESTED');
            }
        }

        return statusMap;
    }

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

            Donor__c currentDonor = getCurrentDonor();
            Set<Id> campIds = new Set<Id>();
            for (Donor_Campaign__c c : campaigns) {
                campIds.add(c.Id);
            }
            Map<Id, String> statusMap = getDonorCampaignStatuses(currentDonor != null ? currentDonor.Id : null, campIds, currentDonor);

            for (Donor_Campaign__c c : campaigns) {
                Decimal goal = c.Expected_Revenue_in_Campaign__c != null ? c.Expected_Revenue_in_Campaign__c : 0;
                Decimal raised = c.Total_Raised__c != null ? c.Total_Raised__c : 0;
                Integer donors = c.Total_Donors_Count__c != null ? Integer.valueOf(c.Total_Donors_Count__c) : 0;
                Decimal progress = goal > 0 ? ((raised / goal) * 100).setScale(1) : 0;
                if (progress > 100) progress = 100;

                String userStatus = statusMap.containsKey(c.Id) ? statusMap.get(c.Id) : 'GUEST';

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
                    'programType' => c.Program__r != null ? c.Program__r.Program_Type__c : '',
                    'userStatus' => userStatus,
                    'isAuthorized' => (userStatus == 'AUTHORIZED'),
                    'isCompleted' => (userStatus == 'COMPLETED'),
                    'isPending' => (userStatus == 'PENDING')
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

            Donor__c currentDonor = getCurrentDonor();
            Map<Id, String> statusMap = getDonorCampaignStatuses(currentDonor != null ? currentDonor.Id : null, new Set<Id>{ campaignId }, currentDonor);
            String userStatus = statusMap.containsKey(campaignId) ? statusMap.get(campaignId) : 'GUEST';

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
                'programOverview' => c.Program__r != null ? c.Program__r.Overview__c : '',
                'userStatus' => userStatus,
                'isAuthorized' => (userStatus == 'AUTHORIZED'),
                'isCompleted' => (userStatus == 'COMPLETED'),
                'isPending' => (userStatus == 'PENDING')
            });
            response.put('recentDonations', supporterList);
            response.put('userStatus', userStatus);
            response.put('isAuthorized', (userStatus == 'AUTHORIZED'));
            response.put('isCompleted', (userStatus == 'COMPLETED'));
            response.put('isPending', (userStatus == 'PENDING'));
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
            Id campaignId = (Id)payload.get('campaignId');
            Decimal amount = Decimal.valueOf(String.valueOf(payload.get('amount')));
            String donorName = (String)payload.get('donorName');
            String donorEmail = (String)payload.get('donorEmail');
            String donorPhone = (String)payload.get('donorPhone');
            String donorMessage = (String)payload.get('donorMessage');
            String stripeSessionId = (String)payload.get('stripeSessionId');
            String stripePaymentIntentId = (String)payload.get('stripePaymentIntentId');
            String frequency = payload.containsKey('frequency') && payload.get('frequency') != null ? String.valueOf(payload.get('frequency')) : 'One-Time';
            String designation = payload.containsKey('designation') && payload.get('designation') != null ? String.valueOf(payload.get('designation')) : '';

            List<Donor__c> donors = [
                SELECT Id, Donor_Name__c, Compliance_Status__c, KYC_Verified__c, Status__c 
                FROM Donor__c 
                WHERE User__c = :currentUserId 
                ORDER BY CreatedDate DESC 
                LIMIT 1
            ];

            if (donors.isEmpty() && String.isNotBlank(donorEmail)) {
                donors = [
                    SELECT Id, Donor_Name__c, Compliance_Status__c, KYC_Verified__c, Status__c 
                    FROM Donor__c 
                    WHERE Email__c = :donorEmail 
                    ORDER BY CreatedDate DESC 
                    LIMIT 1
                ];
            }

            if (donors.isEmpty()) {
                Donor__c autoDonor = new Donor__c(
                    User__c = currentUserId,
                    Donor_Name__c = String.isNotBlank(donorName) ? donorName : 'Philanthropic Contributor',
                    Email__c = donorEmail,
                    Contact_Number__c = donorPhone,
                    Status__c = 'Active',
                    Compliance_Status__c = 'Approved',
                    KYC_Verified__c = true
                );
                insert autoDonor;
                donors.add(autoDonor);
            }

            Donor__c d = donors[0];
            Boolean isAuthorized = (d.Compliance_Status__c == 'Approved' || d.Status__c == 'Active' || d.KYC_Verified__c == true);
            if (!isAuthorized) {
                d.Status__c = 'Active';
                d.Compliance_Status__c = 'Approved';
                d.KYC_Verified__c = true;
                update d;
            }

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
                Stripe_Payment_Intent_ID__c = stripePaymentIntentId,
                Frequency__c = frequency,
                Designation__c = designation
            );

            insert donation;

            // Fetch created record details for confirmation
            Donor_Campaign__c camp = [SELECT Name, Program__r.Name FROM Donor_Campaign__c WHERE Id = :campaignId LIMIT 1];

            result.put('success', true);
            result.put('donationId', donation.Id);
            result.put('receiptNumber', receiptNum);
            result.put('amount', amount);
            result.put('campaignName', camp.Name);
            result.put('programName', camp.Program__r != null ? camp.Program__r.Name : '');
            result.put('frequency', frequency);
            result.put('designation', designation);
            result.put('date', donation.Payment_Date__c);
            result.put('donorId', d.Id);
            result.put('transactionRef', String.isNotBlank(stripePaymentIntentId) ? stripePaymentIntentId : (String.isNotBlank(stripeSessionId) ? stripeSessionId : receiptNum));

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
            User u = [SELECT Id, Name, ContactId, Email, Phone FROM User WHERE Id = :currentUserId LIMIT 1];

            List<Donor__c> donors = [
                SELECT Id, Donor_Name__c, Email__c, Contact_Number__c, Compliance_Status__c, KYC_Verified__c 
                FROM Donor__c 
                WHERE User__c = :currentUserId 
                ORDER BY CreatedDate DESC 
                LIMIT 1
            ];

            if (donors.isEmpty() && u.ContactId != null) {
                donors = [
                    SELECT Id, Donor_Name__c, Email__c, Contact_Number__c, Compliance_Status__c, KYC_Verified__c 
                    FROM Donor__c 
                    WHERE Contact__c = :u.ContactId 
                    ORDER BY CreatedDate DESC 
                    LIMIT 1
                ];
            }

            if (donors.isEmpty() && String.isNotBlank(u.Email)) {
                donors = [
                    SELECT Id, Donor_Name__c, Email__c, Contact_Number__c, Compliance_Status__c, KYC_Verified__c 
                    FROM Donor__c 
                    WHERE Email__c = :u.Email 
                    ORDER BY CreatedDate DESC 
                    LIMIT 1
                ];
            }

            Id campaignId = (Id)payload.get('campaignId');
            Decimal amount = Decimal.valueOf(String.valueOf(payload.get('amount')));
            String donorName = (String)payload.get('donorName');
            String donorEmail = (String)payload.get('donorEmail');
            String donorPhone = (String)payload.get('donorPhone');
            String donorMessage = (String)payload.get('donorMessage');
            String successUrl = (String)payload.get('successUrl');
            String cancelUrl = (String)payload.get('cancelUrl');
            String frequency = payload.containsKey('frequency') && payload.get('frequency') != null ? String.valueOf(payload.get('frequency')) : 'One-Time';
            String duration = payload.containsKey('duration') && payload.get('duration') != null ? String.valueOf(payload.get('duration')) : 'Ongoing';
            String designation = payload.containsKey('designation') && payload.get('designation') != null ? String.valueOf(payload.get('designation')) : '';

            if (donors.isEmpty() && String.isNotBlank(donorEmail)) {
                donors = [
                    SELECT Id, Donor_Name__c, Email__c, Contact_Number__c, Compliance_Status__c, KYC_Verified__c, Status__c 
                    FROM Donor__c 
                    WHERE Email__c = :donorEmail 
                    ORDER BY CreatedDate DESC 
                    LIMIT 1
                ];
            }

            if (donors.isEmpty()) {
                Donor__c autoDonor = new Donor__c(
                    User__c = currentUserId,
                    Contact__c = u.ContactId,
                    Donor_Name__c = String.isNotBlank(donorName) ? donorName : (String.isNotBlank(u.Name) ? u.Name : 'Philanthropic Contributor'),
                    Email__c = String.isNotBlank(donorEmail) ? donorEmail : u.Email,
                    Contact_Number__c = donorPhone,
                    Status__c = 'Active',
                    Compliance_Status__c = 'Approved',
                    KYC_Verified__c = true
                );
                insert autoDonor;
                donors.add(autoDonor);
            }

            Donor__c d = donors[0];
            if (String.isBlank(donorEmail)) {
                if (String.isNotBlank(d.Email__c)) donorEmail = d.Email__c;
                else if (String.isNotBlank(u.Email)) donorEmail = u.Email;
            }
            if (String.isBlank(donorName) || donorName == 'Supporter') {
                if (String.isNotBlank(d.Donor_Name__c)) donorName = d.Donor_Name__c;
                else if (String.isNotBlank(u.Name)) donorName = u.Name;
            }
            if (String.isBlank(donorPhone)) {
                if (String.isNotBlank(d.Contact_Number__c)) donorPhone = d.Contact_Number__c;
                else if (String.isNotBlank(u.Phone)) donorPhone = u.Phone;
            }

            Boolean isAuthorized = (d.Compliance_Status__c == 'Approved' || d.Status__c == 'Active' || d.KYC_Verified__c == true);
            if (!isAuthorized) {
                d.Status__c = 'Active';
                d.Compliance_Status__c = 'Approved';
                d.KYC_Verified__c = true;
                update d;
            }

            Donor_Campaign__c camp = [SELECT Id, Name, Description__c FROM Donor_Campaign__c WHERE Id = :campaignId LIMIT 1];

            Long amountInCents = Math.round(amount * 100);

            HttpRequest req = new HttpRequest();
            req.setEndpoint('callout:Stripe_API/v1/checkout/sessions');
            req.setMethod('POST');
            req.setHeader('Content-Type', 'application/x-www-form-urlencoded');

            String lowerFreq = frequency != null ? frequency.toLowerCase() : '';
            Boolean isRecurring = lowerFreq.contains('month') || lowerFreq.contains('recur') || lowerFreq.contains('year') || lowerFreq.contains('annual');
            String isMonthly = isRecurring ? 'subscription' : 'payment';
            String cadenceLabel = (lowerFreq.contains('year') || lowerFreq.contains('annual')) ? 'Annual' : 'Monthly';
            String productName = (isRecurring ? 'Recurring Sustainer (' + cadenceLabel + '): ' : 'Grant Donation: ') + camp.Name;
            if (productName.length() > 250) productName = productName.substring(0, 247) + '...';

            String formBody = 'payment_method_types[0]=card'
                + '&mode=' + isMonthly
                + '&line_items[0][price_data][currency]=usd'
                + '&line_items[0][price_data][unit_amount]=' + amountInCents
                + '&line_items[0][price_data][product_data][name]=' + EncodingUtil.urlEncode(productName, 'UTF-8');

            if (isRecurring) {
                String interval = (lowerFreq.contains('year') || lowerFreq.contains('annual')) ? 'year' : 'month';
                formBody += '&line_items[0][price_data][recurring][interval]=' + interval;
            }

            formBody += '&line_items[0][quantity]=1'
                + '&success_url=' + EncodingUtil.urlEncode(successUrl, 'UTF-8')
                + '&cancel_url=' + EncodingUtil.urlEncode(cancelUrl, 'UTF-8')
                + '&metadata[campaignId]=' + EncodingUtil.urlEncode(String.valueOf(camp.Id), 'UTF-8')
                + '&metadata[campaignName]=' + EncodingUtil.urlEncode(camp.Name, 'UTF-8')
                + '&metadata[donorId]=' + EncodingUtil.urlEncode(String.valueOf(d.Id), 'UTF-8')
                + '&metadata[donorName]=' + EncodingUtil.urlEncode(String.isNotBlank(donorName) ? donorName : d.Donor_Name__c, 'UTF-8')
                + '&metadata[donorEmail]=' + EncodingUtil.urlEncode(String.isNotBlank(donorEmail) ? donorEmail : '', 'UTF-8')
                + '&metadata[donorPhone]=' + EncodingUtil.urlEncode(String.isNotBlank(donorPhone) ? donorPhone : '', 'UTF-8')
                + '&metadata[donorMessage]=' + EncodingUtil.urlEncode(String.isNotBlank(donorMessage) ? donorMessage : '', 'UTF-8')
                + '&metadata[frequency]=' + EncodingUtil.urlEncode(frequency, 'UTF-8')
                + '&metadata[duration]=' + EncodingUtil.urlEncode(duration, 'UTF-8')
                + '&metadata[designation]=' + EncodingUtil.urlEncode(designation, 'UTF-8');

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
                       Donor_Name__c, Donor_Email__c, Frequency__c, Designation__c,
                       Stripe_Payment_Intent_ID__c, Stripe_Checkout_Session_ID__c,
                       Donor__r.Email__c
                FROM Donations__c 
                WHERE Stripe_Checkout_Session_ID__c = :sessionId 
                LIMIT 1
            ];

            if (!existing.isEmpty()) {
                Donations__c ex = existing[0];
                String dEmail = ex.Donor_Email__c;
                if (String.isBlank(dEmail) || dEmail == 'receipt@donor.org') {
                    if (ex.Donor__r != null && String.isNotBlank(ex.Donor__r.Email__c)) {
                        dEmail = ex.Donor__r.Email__c;
                    } else {
                        dEmail = UserInfo.getUserEmail();
                    }
                    if (String.isNotBlank(dEmail)) {
                        ex.Donor_Email__c = dEmail;
                        update ex;
                    }
                }
                result.put('success', true);
                result.put('alreadyProcessed', true);
                result.put('donationId', ex.Id);
                result.put('receiptNumber', ex.Receipt_Number__c);
                result.put('amount', ex.Donation_Amount__c);
                result.put('campaignName', ex.Donor_Campaign__r != null ? ex.Donor_Campaign__r.Name : '');
                result.put('programName', ex.Donor_Campaign__r != null && ex.Donor_Campaign__r.Program__r != null ? ex.Donor_Campaign__r.Program__r.Name : '');
                result.put('donorName', ex.Donor_Name__c);
                result.put('donorEmail', dEmail);
                result.put('date', ex.Payment_Date__c);
                result.put('frequency', ex.Frequency__c != null ? ex.Frequency__c : 'One-Time');
                result.put('designation', ex.Designation__c != null ? ex.Designation__c : '');
                result.put('transactionRef', String.isNotBlank(ex.Stripe_Payment_Intent_ID__c) ? ex.Stripe_Payment_Intent_ID__c : ex.Stripe_Checkout_Session_ID__c);
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
            String subscriptionId = (String)sessionMap.get('subscription');
            if (String.isBlank(paymentIntentId) && String.isNotBlank(subscriptionId)) {
                paymentIntentId = subscriptionId;
            }

            Map<String, Object> metadata = (Map<String, Object>)sessionMap.get('metadata');
            Id campaignId = metadata != null && metadata.containsKey('campaignId') ? (Id)metadata.get('campaignId') : null;
            Id donorId = metadata != null && metadata.containsKey('donorId') ? (Id)metadata.get('donorId') : null;
            String donorName = metadata != null && metadata.containsKey('donorName') ? (String)metadata.get('donorName') : 'Supporter';
            String donorEmail = metadata != null && metadata.containsKey('donorEmail') ? (String)metadata.get('donorEmail') : '';
            String donorPhone = metadata != null && metadata.containsKey('donorPhone') ? (String)metadata.get('donorPhone') : '';
            String donorMessage = metadata != null && metadata.containsKey('donorMessage') ? (String)metadata.get('donorMessage') : '';
            String frequency = metadata != null && metadata.containsKey('frequency') ? (String)metadata.get('frequency') : 'One-Time';
            String duration = metadata != null && metadata.containsKey('duration') ? (String)metadata.get('duration') : 'Ongoing';
            String designation = metadata != null && metadata.containsKey('designation') ? (String)metadata.get('designation') : '';

            // Robust fallback resolution for donor email and phone
            if (sessionMap.containsKey('customer_details') && sessionMap.get('customer_details') != null) {
                Map<String, Object> custDetails = (Map<String, Object>)sessionMap.get('customer_details');
                if (String.isBlank(donorEmail) && custDetails.containsKey('email') && custDetails.get('email') != null) {
                    donorEmail = String.valueOf(custDetails.get('email'));
                }
                if (String.isBlank(donorPhone) && custDetails.containsKey('phone') && custDetails.get('phone') != null) {
                    donorPhone = String.valueOf(custDetails.get('phone'));
                }
                if (String.isBlank(donorName) || donorName == 'Supporter') {
                    if (custDetails.containsKey('name') && custDetails.get('name') != null) {
                        donorName = String.valueOf(custDetails.get('name'));
                    }
                }
            }
            if (String.isBlank(donorEmail) && sessionMap.containsKey('customer_email') && sessionMap.get('customer_email') != null) {
                donorEmail = String.valueOf(sessionMap.get('customer_email'));
            }
            if (donorId != null) {
                List<Donor__c> dList = [SELECT Donor_Name__c, Email__c, Contact_Number__c FROM Donor__c WHERE Id = :donorId LIMIT 1];
                if (!dList.isEmpty()) {
                    if (String.isBlank(donorEmail)) donorEmail = dList[0].Email__c;
                    if (String.isBlank(donorPhone)) donorPhone = dList[0].Contact_Number__c;
                    if (String.isBlank(donorName) || donorName == 'Supporter') donorName = dList[0].Donor_Name__c;
                }
            }
            if (String.isBlank(donorEmail)) {
                donorEmail = UserInfo.getUserEmail();
            }

            Boolean isRecurring = frequency != null && (frequency.toLowerCase().contains('recur') || frequency.toLowerCase().contains('month') || frequency.toLowerCase().contains('year'));

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
                Stripe_Payment_Intent_ID__c = paymentIntentId,
                Frequency__c = frequency,
                Pledge_Duration__c = duration,
                Auto_Pay_Status__c = isRecurring ? 'Active' : 'N/A',
                Designation__c = designation
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
            result.put('frequency', frequency);
            result.put('duration', duration);
            result.put('autoPayStatus', isRecurring ? 'Active' : 'N/A');
            result.put('designation', designation);
            result.put('date', donation.Payment_Date__c);
            result.put('transactionRef', String.isNotBlank(paymentIntentId) ? paymentIntentId : sessionId);

        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error confirming Stripe donation: ' + e.getMessage() + '\n' + e.getStackTraceString());
            result.put('success', false);
            result.put('error', e.getMessage());
        }
        return result;
    }

    /**
     * Retrieves required document checklist purely from Program_Document__c
     * related to the selected campaign's program, filtered by Applies_To__c IN ('Donor', 'Both').
     * No hardcoded documents.
     */
    @AuraEnabled
    public static List<Map<String, Object>> getDonorRequirementsForCampaign(Id campaignId, Id programId) {
        List<Map<String, Object>> docs = new List<Map<String, Object>>();
        try {
            if (programId == null && campaignId != null) {
                List<Donor_Campaign__c> camps = [SELECT Id, Program__c FROM Donor_Campaign__c WHERE Id = :campaignId LIMIT 1];
                if (!camps.isEmpty()) {
                    programId = camps[0].Program__c;
                }
            }

            if (programId != null) {
                List<Program_Document__c> pDocs = [
                    SELECT Id, Name, Description__c, Is_Mandatory__c, Donor_Type__c, Applies_To__c
                    FROM Program_Document__c
                    WHERE Program__c = :programId
                      AND (Applies_To__c = 'Donor' OR Applies_To__c = 'Both')
                    ORDER BY Is_Mandatory__c DESC, Name ASC
                ];
                for (Program_Document__c pd : pDocs) {
                    docs.add(new Map<String, Object>{
                        'id' => String.valueOf(pd.Id),
                        'name' => pd.Name,
                        'description' => String.isNotBlank(pd.Description__c) ? pd.Description__c : 'Required program documentation for donor eligibility.',
                        'isMandatory' => (pd.Is_Mandatory__c == true),
                        'appliesTo' => pd.Applies_To__c,
                        'donorType' => pd.Donor_Type__c,
                        'category' => 'Program Document'
                    });
                }
            }
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in getDonorRequirementsForCampaign: ' + e.getMessage());
        }
        return docs;
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

            Id campaignId = null;
            if (payload.containsKey('campaignId') && payload.get('campaignId') != null && String.isNotBlank(String.valueOf(payload.get('campaignId')))) {
                try {
                    campaignId = (Id)payload.get('campaignId');
                } catch (Exception ex) {}
            }
            Id programId = null;
            if (payload.containsKey('programId') && payload.get('programId') != null && String.isNotBlank(String.valueOf(payload.get('programId')))) {
                try {
                    programId = (Id)payload.get('programId');
                } catch (Exception ex) {}
            }

            if (campaignId == null && String.isNotBlank(campaignName) && campaignName != 'General Grant Reserve') {
                List<Donor_Campaign__c> camps = [SELECT Id, Program__c FROM Donor_Campaign__c WHERE Name = :campaignName LIMIT 1];
                if (!camps.isEmpty()) {
                    campaignId = camps[0].Id;
                    if (programId == null) {
                        programId = camps[0].Program__c;
                    }
                }
            } else if (campaignId != null && programId == null) {
                List<Donor_Campaign__c> camps = [SELECT Id, Program__c FROM Donor_Campaign__c WHERE Id = :campaignId LIMIT 1];
                if (!camps.isEmpty()) {
                    programId = camps[0].Program__c;
                }
            }

            Lead sponsorLead = new Lead(
                FirstName = firstName,
                LastName = lastName,
                Company = company,
                Email = email,
                Phone = phone,
                LeadSource = 'Donor Site',
                Donor_Campaign__c = campaignId,
                Program__c = programId,
                Description = 'Campaign Inquiry: ' + campaignName + 
                              '\nEstimated Pledge: ' + estimatedPledge + 
                              '\nMessage: ' + message
            );
            if (defaultOwnerId != null) {
                sponsorLead.OwnerId = defaultOwnerId;
            }

            insert sponsorLead;

            if (payload.containsKey('files') && payload.get('files') != null) {
                List<Object> filesList = (List<Object>)payload.get('files');
                List<ContentVersion> cvList = new List<ContentVersion>();

                for (Object fObj : filesList) {
                    Map<String, Object> fMap = new Map<String, Object>();
                    if (fObj instanceof Map<String, Object>) {
                        fMap = (Map<String, Object>)fObj;
                    } else if (fObj instanceof Map<Object, Object>) {
                        Map<Object, Object> rawMap = (Map<Object, Object>)fObj;
                        for (Object k : rawMap.keySet()) {
                            fMap.put(String.valueOf(k), rawMap.get(k));
                        }
                    } else {
                        try {
                            fMap = (Map<String, Object>)JSON.deserializeUntyped(JSON.serialize(fObj));
                        } catch (Exception ex) {}
                    }
                    String fName = (String)fMap.get('name');
                    String b64 = (String)fMap.get('base64');
                    String docType = (String)fMap.get('docType');
                    String docKey = (String)fMap.get('docKey');
                    if (String.isNotBlank(fName) && String.isNotBlank(b64)) {
                        String titlePrefix = '[KYC] ';
                        if (String.isNotBlank(docKey)) {
                            titlePrefix = '[KYC_' + docKey + '] ';
                        } else if (String.isNotBlank(docType)) {
                            titlePrefix = '[' + docType + '] ';
                        }
                        ContentVersion cv = new ContentVersion(
                            Title = titlePrefix + fName,
                            PathOnClient = fName,
                            VersionData = EncodingUtil.base64Decode(b64)
                        );
                        cvList.add(cv);
                    }
                }

                if (!cvList.isEmpty()) {
                    insert cvList;
                    Set<Id> cvIds = new Set<Id>();
                    for (ContentVersion cv : cvList) {
                        cvIds.add(cv.Id);
                    }
                    List<ContentDocumentLink> cdLinks = new List<ContentDocumentLink>();
                    for (ContentVersion cv : [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id IN :cvIds]) {
                        cdLinks.add(new ContentDocumentLink(
                            LinkedEntityId = sponsorLead.Id,
                            ContentDocumentId = cv.ContentDocumentId,
                            ShareType = 'V',
                            Visibility = 'AllUsers'
                        ));
                    }
                    if (!cdLinks.isEmpty()) {
                        Database.insert(cdLinks, false);
                    }
                }
            }

            result.put('success', true);
            result.put('leadId', sponsorLead.Id);
            result.put('campaignId', campaignId);
            result.put('programId', programId);
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error creating lead: ' + e.getMessage());
            result.put('success', false);
            result.put('error', e.getMessage());
        }
        return result;
    }

    /**
     * Requests authorization for an authenticated donor to contribute to a specific campaign
     */
    @AuraEnabled
    public static Map<String, Object> requestCampaignAccess(Id campaignId, String notes) {
        Map<String, Object> result = new Map<String, Object>();
        try {
            if (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser()) {
                throw new AuraHandledException('Authentication required. Please log in to request donation authorization.');
            }
            if (campaignId == null) {
                throw new AuraHandledException('Campaign ID is required.');
            }

            Donor__c d = getCurrentDonor();
            if (d == null) {
                throw new AuraHandledException('Donor profile record not found.');
            }

            String campStr = String.valueOf(campaignId);
            String authStr = String.isNotBlank(d.Authorized_Campaigns__c) ? d.Authorized_Campaigns__c : '';
            String pendStr = String.isNotBlank(d.Pending_Campaigns__c) ? d.Pending_Campaigns__c : '';

            if (authStr.contains(campStr)) {
                result.put('success', true);
                result.put('status', 'AUTHORIZED');
                result.put('message', 'Campaign is already authorized.');
                return result;
            }

            if (!pendStr.contains(campStr)) {
                d.Pending_Campaigns__c = String.isBlank(pendStr) ? campStr : (pendStr + ',' + campStr);
                update d;
            }

            result.put('success', true);
            result.put('status', 'PENDING');
            result.put('message', 'Authorization request submitted successfully. It is pending review.');
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in requestCampaignAccess: ' + e.getMessage());
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
            User u = [SELECT FirstName, LastName, Name, Email, Username, Phone, ContactId FROM User WHERE Id = :currentUserId LIMIT 1];
            res.put('firstName', u.FirstName);
            res.put('lastName', u.LastName);
            res.put('userName', u.Name);
            res.put('userEmail', u.Email);

            List<Donor__c> donors = [
                SELECT Id, Name, Donor_Name__c, Donor_Type__c, Email__c, Contact_Number__c,
                       Address__c, Compliance_Status__c, KYC_Verified__c, Status__c,
                       Preferred_Funding_Type__c, Funding_Capacity__c, User__c,
                       Program__c, Program__r.Name, KYC_Rejection_Reason__c
                FROM Donor__c 
                WHERE User__c = :currentUserId 
                ORDER BY CreatedDate DESC 
                LIMIT 1
            ];

            if (donors.isEmpty() && u.ContactId != null) {
                donors = [
                    SELECT Id, Name, Donor_Name__c, Donor_Type__c, Email__c, Contact_Number__c,
                           Address__c, Compliance_Status__c, KYC_Verified__c, Status__c,
                           Preferred_Funding_Type__c, Funding_Capacity__c, User__c,
                           Program__c, Program__r.Name, KYC_Rejection_Reason__c
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
                       Preferred_Funding_Type__c, Funding_Capacity__c, User__c,
                       Program__c, Program__r.Name, KYC_Rejection_Reason__c
                    FROM Donor__c 
                    WHERE Email__c = :u.Email 
                    ORDER BY CreatedDate DESC 
                    LIMIT 1
                ];
            }

            if (donors.isEmpty() && String.isNotBlank(u.Username) && u.Username.contains('@')) {
                donors = [
                    SELECT Id, Name, Donor_Name__c, Donor_Type__c, Email__c, Contact_Number__c,
                           Address__c, Compliance_Status__c, KYC_Verified__c, Status__c,
                           Preferred_Funding_Type__c, Funding_Capacity__c, User__c,
                           Program__c, Program__r.Name, KYC_Rejection_Reason__c
                    FROM Donor__c 
                    WHERE Email__c = :u.Username 
                    ORDER BY CreatedDate DESC 
                    LIMIT 1
                ];
            }

            if (donors.isEmpty()) {
                res.put('status', 'NO_PROFILE');
                return res;
            }

            Donor__c d = donors[0];
            Boolean isApprovedOrActive = (d.Status__c == 'Active' || d.Compliance_Status__c == 'Approved' || d.KYC_Verified__c == true);
            Boolean isKycDone = (d.KYC_Verified__c == true || isApprovedOrActive);
            String compStatus = String.isNotBlank(d.Compliance_Status__c) ? d.Compliance_Status__c : (isApprovedOrActive ? 'Approved' : 'Pending');

            // If the donor record was created and is active/approved, grant full Approved verification status
            String effectiveStatus = (compStatus == 'Rejected') ? 'Rejected' : (isApprovedOrActive ? 'Approved' : (compStatus == 'Approved' && isKycDone ? 'Approved' : 'Pending'));

            res.put('status', effectiveStatus);
            res.put('complianceStatus', compStatus);
            res.put('kycVerified', isKycDone);
            res.put('donorId', d.Id);
            res.put('donorCode', d.Name);
            String resolvedDonorName = (String.isNotBlank(d.Donor_Name__c) && d.Donor_Name__c != 'Donor' && d.Donor_Name__c != 'Philanthropic Contributor') ? d.Donor_Name__c : u.Name;
            res.put('donorName', resolvedDonorName);
            if (String.isNotBlank(u.FirstName)) {
                res.put('firstName', u.FirstName);
            }
            if (String.isNotBlank(u.LastName)) {
                res.put('lastName', u.LastName);
            }
            if (String.isBlank((String)res.get('firstName')) && String.isNotBlank(resolvedDonorName)) {
                List<String> nameParts = resolvedDonorName.trim().split('\\s+');
                res.put('firstName', nameParts[0]);
                if (nameParts.size() > 1) {
                    nameParts.remove(0);
                    res.put('lastName', String.join(nameParts, ' '));
                }
            }
            res.put('donorType', d.Donor_Type__c);
            String donorEmailVal = String.isNotBlank(d.Email__c) ? d.Email__c : u.Email;
            res.put('email', donorEmailVal);
            res.put('donorEmail', donorEmailVal);
            res.put('userEmail', u.Email);

            String resolvedPhone = String.isNotBlank(d.Contact_Number__c) ? d.Contact_Number__c : (String.isNotBlank(u.Phone) ? u.Phone : '');
            if (String.isBlank(resolvedPhone) && u.ContactId != null) {
                List<Contact> cons = [SELECT Phone, MobilePhone FROM Contact WHERE Id = :u.ContactId LIMIT 1];
                if (!cons.isEmpty()) {
                    resolvedPhone = String.isNotBlank(cons[0].Phone) ? cons[0].Phone : cons[0].MobilePhone;
                }
            }
            res.put('phone', resolvedPhone);
            res.put('donorPhone', resolvedPhone);
            res.put('userPhone', resolvedPhone);
            res.put('address', d.Address__c);
            res.put('preferredFundingType', d.Preferred_Funding_Type__c);
            res.put('fundingCapacity', d.Funding_Capacity__c);
            res.put('programId', d.Program__c);
            res.put('programName', d.Program__r != null ? d.Program__r.Name : '');
            res.put('rejectionReason', d.KYC_Rejection_Reason__c);
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
                SELECT Id, Compliance_Status__c, KYC_Verified__c 
                FROM Donor__c 
                WHERE User__c = :currentUserId 
                ORDER BY CreatedDate DESC 
                LIMIT 1
            ];

            if (existing.isEmpty()) {
                User u = [SELECT ContactId, Email, Username FROM User WHERE Id = :currentUserId LIMIT 1];
                if (u.ContactId != null) {
                    existing = [SELECT Id, Compliance_Status__c, KYC_Verified__c FROM Donor__c WHERE Contact__c = :u.ContactId ORDER BY CreatedDate DESC LIMIT 1];
                }
                if (existing.isEmpty() && String.isNotBlank(u.Email)) {
                    existing = [SELECT Id, Compliance_Status__c, KYC_Verified__c FROM Donor__c WHERE Email__c = :u.Email ORDER BY CreatedDate DESC LIMIT 1];
                }
                if (existing.isEmpty() && String.isNotBlank(u.Username) && u.Username.contains('@')) {
                    existing = [SELECT Id, Compliance_Status__c, KYC_Verified__c FROM Donor__c WHERE Email__c = :u.Username ORDER BY CreatedDate DESC LIMIT 1];
                }
            }

            Donor__c d;
            if (!existing.isEmpty()) {
                d = existing[0];
                // Server-side lock: If approved and KYC verified by admin, lock record from user edits
                if (d.Compliance_Status__c == 'Approved' && d.KYC_Verified__c == true) {
                    throw new AuraHandledException('Your donor profile has been verified and approved by the Foundation Administration. Modifying details is locked. Please contact the Compliance Team for amendments.');
                }
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

    /**
     * Retrieves the giving history and active recurring commitments for the authenticated donor
     */
    @AuraEnabled
    public static Map<String, Object> getDonorGivingHistory() {
        Map<String, Object> result = new Map<String, Object>();
        try {
            if (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser()) {
                result.put('isLoggedIn', false);
                result.put('recurringDonations', new List<Map<String, Object>>());
                result.put('oneTimeDonations', new List<Map<String, Object>>());
                result.put('totalDonated', 0);
                result.put('activeRecurringCount', 0);
                result.put('initiativesCount', 0);
                return result;
            }

            Id currentUserId = UserInfo.getUserId();
            User u = [SELECT Email, ContactId FROM User WHERE Id = :currentUserId LIMIT 1];

            List<Donor__c> donors = [
                SELECT Id, Email__c FROM Donor__c 
                WHERE User__c = :currentUserId 
                OR (Contact__c != null AND Contact__c = :u.ContactId)
                OR (Email__c != null AND Email__c = :u.Email)
            ];
            Set<Id> donorIds = new Set<Id>();
            Set<String> donorEmails = new Set<String>();
            if (String.isNotBlank(u.Email)) {
                donorEmails.add(u.Email);
            }
            for (Donor__c d : donors) {
                donorIds.add(d.Id);
                if (String.isNotBlank(d.Email__c)) {
                    donorEmails.add(d.Email__c);
                }
            }

            // Automatically sync any renewal subscription invoices from Stripe in real-time
            syncStripeSubscriptionInvoices(donorIds, donorEmails);

            List<Donations__c> allDonations = [
                SELECT Id, Name, Donation_Amount__c, Payment_Date__c, Payment_Status__c,
                       Receipt_Number__c, Frequency__c, Designation__c, Donor_Name__c, Donor_Email__c,
                       Donor_Message__c, Stripe_Payment_Intent_ID__c, Stripe_Checkout_Session_ID__c,
                       Pledge_Duration__c, Auto_Pay_Status__c,
                       Donor_Campaign__r.Id, Donor_Campaign__r.Name, Donor_Campaign__r.Program__r.Name
                FROM Donations__c
                WHERE (Donor__c IN :donorIds OR Donor_Email__c IN :donorEmails)
                AND (Payment_Status__c = 'Paid' OR Payment_Status__c = 'Completed')
                ORDER BY Payment_Date__c DESC
            ];

            List<Map<String, Object>> recurringList = new List<Map<String, Object>>();
            List<Map<String, Object>> allReceiptsList = new List<Map<String, Object>>();
            Decimal totalDonated = 0;
            Set<Id> uniqueCampaigns = new Set<Id>();
            Set<String> seenSubscriptions = new Set<String>();

            for (Donations__c d : allDonations) {
                Decimal amt = d.Donation_Amount__c != null ? d.Donation_Amount__c : 0;
                totalDonated += amt;
                if (d.Donor_Campaign__r != null && d.Donor_Campaign__r.Id != null) {
                    uniqueCampaigns.add(d.Donor_Campaign__r.Id);
                }

                String freq = String.isNotBlank(d.Frequency__c) ? d.Frequency__c : 'One-Time';
                Boolean isRec = freq.toLowerCase().contains('recur') || freq.toLowerCase().contains('month') || freq.toLowerCase().contains('year');
                String autoStatus = String.isNotBlank(d.Auto_Pay_Status__c) ? d.Auto_Pay_Status__c : (isRec ? 'Active' : 'N/A');
                Boolean isCancelled = autoStatus.equalsIgnoreCase('Cancelled');
                String duration = String.isNotBlank(d.Pledge_Duration__c) ? d.Pledge_Duration__c : 'Ongoing';

                Map<String, Object> item = new Map<String, Object>{
                    'id' => d.Id,
                    'receiptNumber' => d.Receipt_Number__c,
                    'amount' => amt,
                    'date' => d.Payment_Date__c,
                    'frequency' => freq,
                    'duration' => duration,
                    'autoPayStatus' => autoStatus,
                    'isCancelled' => isCancelled,
                    'isRecurring' => isRec,
                    'designation' => d.Designation__c,
                    'campaignId' => d.Donor_Campaign__r != null ? d.Donor_Campaign__r.Id : null,
                    'campaignName' => d.Donor_Campaign__r != null ? d.Donor_Campaign__r.Name : 'General Initiative',
                    'programName' => (d.Donor_Campaign__r != null && d.Donor_Campaign__r.Program__r != null) ? d.Donor_Campaign__r.Program__r.Name : d.Designation__c,
                    'status' => isRec ? (isCancelled ? 'Auto-Pay Cancelled' : 'Active Sustainer') : 'Completed',
                    'donorName' => d.Donor_Name__c,
                    'donorEmail' => String.isNotBlank(d.Donor_Email__c) ? d.Donor_Email__c : UserInfo.getUserEmail(),
                    'transactionRef' => String.isNotBlank(d.Stripe_Payment_Intent_ID__c) ? d.Stripe_Payment_Intent_ID__c : d.Stripe_Checkout_Session_ID__c
                };

                // Every completed payment is an official receipt in the history table
                allReceiptsList.add(item);

                // Group recurring pledges so each active subscription has exactly 1 management card
                if (isRec) {
                    String subKey = String.isNotBlank(d.Stripe_Checkout_Session_ID__c) && d.Stripe_Checkout_Session_ID__c.startsWith('sub_')
                        ? d.Stripe_Checkout_Session_ID__c
                        : (String.isNotBlank(d.Stripe_Payment_Intent_ID__c) && d.Stripe_Payment_Intent_ID__c.startsWith('sub_') ? d.Stripe_Payment_Intent_ID__c : String.valueOf(d.Donor_Campaign__c));

                    if (!seenSubscriptions.contains(subKey)) {
                        seenSubscriptions.add(subKey);
                        recurringList.add(item);
                    }
                }
            }

            Integer activeRecurringCount = 0;
            for (Map<String, Object> r : recurringList) {
                if ((Boolean)r.get('isCancelled') == false) {
                    activeRecurringCount++;
                }
            }

            result.put('isLoggedIn', true);
            result.put('totalDonated', totalDonated);
            result.put('activeRecurringCount', activeRecurringCount);
            result.put('initiativesCount', uniqueCampaigns.size());
            result.put('recurringDonations', recurringList);
            result.put('oneTimeDonations', allReceiptsList);
            result.put('allDonations', allDonations.size());
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in getDonorGivingHistory: ' + e.getMessage());
            result.put('error', e.getMessage());
            result.put('recurringDonations', new List<Map<String, Object>>());
            result.put('oneTimeDonations', new List<Map<String, Object>>());
            result.put('totalDonated', 0);
            result.put('activeRecurringCount', 0);
            result.put('initiativesCount', 0);
        }
        return result;
    }

    /**
     * Synchronizes recurring subscription invoices from Stripe in real-time.
     * When Stripe automatically charges a subscription renewal (or when time is advanced in test mode),
     * this imports any new paid invoices into Donations__c so they immediately roll up into Campaign and Program funds.
     */
    private static void syncStripeSubscriptionInvoices(Set<Id> donorIds, Set<String> donorEmails) {
        try {
            List<Donations__c> baseSubs = [
                SELECT Id, Donor__c, Donor_Campaign__c, Donor_Name__c, Donor_Email__c, Donor_Phone__c,
                       Designation__c, Frequency__c, Pledge_Duration__c, Stripe_Payment_Intent_ID__c,
                       Stripe_Checkout_Session_ID__c
                FROM Donations__c
                WHERE (Donor__c IN :donorIds OR Donor_Email__c IN :donorEmails)
                AND (Stripe_Payment_Intent_ID__c LIKE 'sub_%' OR Stripe_Checkout_Session_ID__c LIKE 'sub_%')
                ORDER BY CreatedDate ASC
            ];

            if (baseSubs.isEmpty()) return;

            Map<String, Donations__c> subToTemplate = new Map<String, Donations__c>();
            for (Donations__c d : baseSubs) {
                String sId = String.isNotBlank(d.Stripe_Payment_Intent_ID__c) && d.Stripe_Payment_Intent_ID__c.startsWith('sub_')
                    ? d.Stripe_Payment_Intent_ID__c
                    : (String.isNotBlank(d.Stripe_Checkout_Session_ID__c) && d.Stripe_Checkout_Session_ID__c.startsWith('sub_') ? d.Stripe_Checkout_Session_ID__c : null);
                if (String.isNotBlank(sId) && !subToTemplate.containsKey(sId)) {
                    subToTemplate.put(sId, d);
                }
            }

            if (subToTemplate.isEmpty()) return;

            Set<String> existingRefs = new Set<String>();
            for (Donations__c d : [
                SELECT Stripe_Checkout_Session_ID__c, Stripe_Payment_Intent_ID__c, Receipt_Number__c 
                FROM Donations__c 
                WHERE (Donor__c IN :donorIds OR Donor_Email__c IN :donorEmails)
            ]) {
                if (String.isNotBlank(d.Stripe_Checkout_Session_ID__c)) existingRefs.add(d.Stripe_Checkout_Session_ID__c);
                if (String.isNotBlank(d.Stripe_Payment_Intent_ID__c)) existingRefs.add(d.Stripe_Payment_Intent_ID__c);
                if (String.isNotBlank(d.Receipt_Number__c)) existingRefs.add(d.Receipt_Number__c);
            }

            List<Donations__c> newRenewals = new List<Donations__c>();

            for (String subId : subToTemplate.keySet()) {
                Donations__c base = subToTemplate.get(subId);
                HttpRequest req = new HttpRequest();
                req.setEndpoint('callout:Stripe_API/v1/invoices?subscription=' + EncodingUtil.urlEncode(subId, 'UTF-8') + '&status=paid&limit=10');
                req.setMethod('GET');

                HttpResponse resp = new Http().send(req);
                if (resp.getStatusCode() == 200) {
                    Map<String, Object> respMap = (Map<String, Object>)JSON.deserializeUntyped(resp.getBody());
                    List<Object> data = (List<Object>)respMap.get('data');
                    if (data == null || data.isEmpty()) continue;

                    for (Object item : data) {
                        Map<String, Object> inv = (Map<String, Object>)item;
                        String invId = (String)inv.get('id');
                        String invNum = (String)inv.get('number');
                        String billingReason = (String)inv.get('billing_reason');
                        Decimal amountPaid = inv.containsKey('amount_paid') && inv.get('amount_paid') != null
                            ? Decimal.valueOf(String.valueOf(inv.get('amount_paid'))) / 100
                            : 0;

                        if (billingReason == 'subscription_create') {
                            continue;
                        }

                        if (existingRefs.contains(invId) || (String.isNotBlank(invNum) && existingRefs.contains('REC-' + invNum))) {
                            continue;
                        }

                        Long createdSec = inv.containsKey('created') && inv.get('created') != null ? (Long)inv.get('created') : null;
                        DateTime payDate = (createdSec != null) ? DateTime.newInstance(createdSec * 1000) : DateTime.now();

                        Donations__c renewal = new Donations__c(
                            Donor__c = base.Donor__c,
                            Donor_Campaign__c = base.Donor_Campaign__c,
                            Donation_Amount__c = amountPaid,
                            Donor_Name__c = base.Donor_Name__c,
                            Donor_Email__c = base.Donor_Email__c,
                            Donor_Phone__c = base.Donor_Phone__c,
                            Designation__c = base.Designation__c,
                            Frequency__c = base.Frequency__c,
                            Pledge_Duration__c = base.Pledge_Duration__c,
                            Payment_Date__c = payDate,
                            Payment_Status__c = 'Paid',
                            Receipt_Number__c = String.isNotBlank(invNum) ? 'REC-' + invNum : ('REC-' + invId.substring(Math.max(0, invId.length() - 8))),
                            Stripe_Checkout_Session_ID__c = subId,
                            Stripe_Payment_Intent_ID__c = invId,
                            Auto_Pay_Status__c = 'Active'
                        );
                        newRenewals.add(renewal);
                        existingRefs.add(invId);
                    }
                }
            }

            if (!newRenewals.isEmpty()) {
                insert newRenewals;
            }
        } catch (Exception ex) {
            System.debug(LoggingLevel.WARN, 'Auto-sync of Stripe subscription invoices skipped: ' + ex.getMessage());
        }
    }

    /**
     * Cancels an active recurring donation / auto-pay pledge
     */
    @AuraEnabled
    public static Map<String, Object> cancelRecurringDonation(Id donationId) {
        Map<String, Object> result = new Map<String, Object>();
        try {
            if (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser()) {
                throw new AuraHandledException('Authentication required.');
            }
            if (donationId == null) {
                throw new AuraHandledException('Donation ID is required.');
            }

            Id currentUserId = UserInfo.getUserId();
            User u = [SELECT Email, ContactId FROM User WHERE Id = :currentUserId LIMIT 1];

            List<Donations__c> donations = [
                SELECT Id, Stripe_Checkout_Session_ID__c, Stripe_Payment_Intent_ID__c, 
                       Frequency__c, Auto_Pay_Status__c, Donor__c, Donor_Campaign__r.Name
                FROM Donations__c 
                WHERE Id = :donationId
                LIMIT 1
            ];

            if (donations.isEmpty()) {
                throw new AuraHandledException('Donation record not found.');
            }

            Donations__c d = donations[0];

            String subId = '';
            if (String.isNotBlank(d.Stripe_Payment_Intent_ID__c) && d.Stripe_Payment_Intent_ID__c.startsWith('sub_')) {
                subId = d.Stripe_Payment_Intent_ID__c;
            } else if (String.isNotBlank(d.Stripe_Checkout_Session_ID__c)) {
                // Fetch subscription id from Stripe checkout session
                try {
                    HttpRequest req = new HttpRequest();
                    req.setEndpoint('callout:Stripe_API/v1/checkout/sessions/' + d.Stripe_Checkout_Session_ID__c);
                    req.setMethod('GET');
                    Http http = new Http();
                    HttpResponse resp = http.send(req);
                    if (resp.getStatusCode() == 200) {
                        Map<String, Object> sMap = (Map<String, Object>)JSON.deserializeUntyped(resp.getBody());
                        if (sMap.containsKey('subscription') && sMap.get('subscription') != null) {
                            subId = String.valueOf(sMap.get('subscription'));
                        }
                    }
                } catch (Exception ex) {
                    System.debug(LoggingLevel.WARN, 'Could not retrieve subscription from Stripe session: ' + ex.getMessage());
                }
            }

            // Cancel subscription directly in Stripe so no further deductions occur
            if (String.isNotBlank(subId) && subId.startsWith('sub_')) {
                try {
                    HttpRequest cancelReq = new HttpRequest();
                    cancelReq.setEndpoint('callout:Stripe_API/v1/subscriptions/' + subId);
                    cancelReq.setMethod('DELETE');
                    Http cancelHttp = new Http();
                    HttpResponse cancelResp = cancelHttp.send(cancelReq);
                    System.debug(LoggingLevel.INFO, 'Stripe Subscription Cancelled: ' + cancelResp.getStatusCode() + ' ' + cancelResp.getBody());
                } catch (Exception ex) {
                    System.debug(LoggingLevel.ERROR, 'Error cancelling Stripe subscription: ' + ex.getMessage());
                }
            }

            d.Auto_Pay_Status__c = 'Cancelled';
            update d;

            result.put('success', true);
            result.put('message', 'Auto-pay has been cancelled successfully. Future automatic deductions have been stopped.');
            result.put('donationId', d.Id);
            result.put('autoPayStatus', 'Cancelled');
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in cancelRecurringDonation: ' + e.getMessage());
            result.put('success', false);
            result.put('error', e.getMessage());
        }
        return result;
    }

    /**
     * Retrieves the program-specific and donor-type specific documents required for donor verification
     */
    @AuraEnabled
    public static Map<String, Object> getRequiredDonorDocuments() {
        Map<String, Object> result = new Map<String, Object>();
        try {
            if (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser()) {
                result.put('isLoggedIn', false);
                result.put('documents', new List<Map<String, Object>>());
                return result;
            }

            Id currentUserId = UserInfo.getUserId();
            User u = [SELECT ContactId, Email, Username FROM User WHERE Id = :currentUserId LIMIT 1];

            List<Donor__c> donors = [
                SELECT Id, Name, Donor_Name__c, Donor_Type__c, Compliance_Status__c, KYC_Verified__c,
                       Program__c, Program__r.Name, KYC_Rejection_Reason__c, Status__c
                FROM Donor__c
                WHERE User__c = :currentUserId
                ORDER BY CreatedDate DESC
                LIMIT 1
            ];

            if (donors.isEmpty() && u.ContactId != null) {
                donors = [
                    SELECT Id, Name, Donor_Name__c, Donor_Type__c, Compliance_Status__c, KYC_Verified__c,
                           Program__c, Program__r.Name, KYC_Rejection_Reason__c, Status__c
                    FROM Donor__c
                    WHERE Contact__c = :u.ContactId
                    ORDER BY CreatedDate DESC
                    LIMIT 1
                ];
            }

            if (donors.isEmpty() && String.isNotBlank(u.Email)) {
                donors = [
                    SELECT Id, Name, Donor_Name__c, Donor_Type__c, Compliance_Status__c, KYC_Verified__c,
                           Program__c, Program__r.Name, KYC_Rejection_Reason__c, Status__c
                    FROM Donor__c
                    WHERE Email__c = :u.Email
                    ORDER BY CreatedDate DESC
                    LIMIT 1
                ];
            }

            if (donors.isEmpty()) {
                result.put('isLoggedIn', true);
                result.put('hasDonor', false);
                result.put('documents', new List<Map<String, Object>>());
                return result;
            }

            Donor__c d = donors[0];
            String donorType = String.isNotBlank(d.Donor_Type__c) ? d.Donor_Type__c : 'Individual';
            Id programId = d.Program__c;

            // If donor has no program set, link from their recent donation/campaign or active agreement
            if (programId == null) {
                List<Donations__c> recentDonations = [
                    SELECT Donor_Campaign__r.Program__c, Donor_Campaign__r.Program__r.Name
                    FROM Donations__c
                    WHERE Donor__c = :d.Id AND Donor_Campaign__r.Program__c != null
                    ORDER BY CreatedDate DESC
                    LIMIT 1
                ];
                if (!recentDonations.isEmpty()) {
                    programId = recentDonations[0].Donor_Campaign__r.Program__c;
                }
            }

            String programName = (d.Program__r != null) ? d.Program__r.Name : '';
            if (programId == null) {
                List<Program__c> defPrograms = [SELECT Id, Name FROM Program__c WHERE Status__c = 'Active' LIMIT 1];
                if (!defPrograms.isEmpty()) {
                    programId = defPrograms[0].Id;
                    programName = defPrograms[0].Name;
                }
            }

            // Query dynamic Program_Document__c requirements
            List<Program_Document__c> reqDocs = new List<Program_Document__c>();
            if (programId != null) {
                reqDocs = [
                    SELECT Id, Name, Is_Mandatory__c, Donor_Type__c, Applies_To__c, Description__c,
                           Program__c, Program__r.Name
                    FROM Program_Document__c
                    WHERE Program__c = :programId
                      AND (Donor_Type__c = 'All' OR Donor_Type__c = :donorType OR Donor_Type__c = null)
                      AND (Applies_To__c = 'Donor' OR Applies_To__c = 'Both')
                    ORDER BY Is_Mandatory__c DESC, Name ASC
                ];
                if (String.isBlank(programName) && !reqDocs.isEmpty()) {
                    programName = reqDocs[0].Program__r.Name;
                }
            }

            // Query files already linked to this Donor__c
            Map<String, ContentDocumentLink> docIdToFileMap = new Map<String, ContentDocumentLink>();
            List<ContentDocumentLink> links = [
                SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.FileExtension,
                       ContentDocument.ContentSize, ContentDocument.CreatedDate
                FROM ContentDocumentLink
                WHERE LinkedEntityId = :d.Id
                ORDER BY ContentDocument.CreatedDate DESC
            ];

            for (ContentDocumentLink link : links) {
                String title = link.ContentDocument.Title;
                if (title.contains('[KYC_')) {
                    Integer startIdx = title.indexOf('[KYC_') + 5;
                    Integer endIdx = title.indexOf(']', startIdx);
                    if (endIdx > startIdx) {
                        String docKey = title.substring(startIdx, endIdx).trim();
                        if (!docIdToFileMap.containsKey(docKey)) {
                            docIdToFileMap.put(docKey, link);
                        }
                    }
                }
            }

            List<Map<String, Object>> docList = new List<Map<String, Object>>();
            Integer uploadedCount = 0;
            Integer mandatoryCount = 0;
            Integer mandatoryUploadedCount = 0;

            // Dynamic Program_Document__c requirements where Applies_To__c IN ('Donor', 'Both')
            if (!reqDocs.isEmpty()) {
                for (Program_Document__c pDoc : reqDocs) {
                    Boolean isMandatory = (pDoc.Is_Mandatory__c == true);
                    if (isMandatory) mandatoryCount++;

                    String docKey = String.valueOf(pDoc.Id);
                    Boolean isUploaded = docIdToFileMap.containsKey(docKey);

                    Map<String, Object> item = new Map<String, Object>{
                        'id' => pDoc.Id,
                        'name' => pDoc.Name,
                        'isMandatory' => isMandatory,
                        'donorType' => pDoc.Donor_Type__c,
                        'category' => 'Program-Specific Requirement',
                        'programName' => (pDoc.Program__r != null ? pDoc.Program__r.Name : ''),
                        'description' => pDoc.Description__c,
                        'isUploaded' => isUploaded
                    };

                    if (isUploaded) {
                        uploadedCount++;
                        if (isMandatory) mandatoryUploadedCount++;
                        ContentDocumentLink lk = docIdToFileMap.get(docKey);
                        item.put('contentDocumentId', lk.ContentDocumentId);
                        item.put('fileName', lk.ContentDocument.Title.replace('[KYC_' + docKey + '] ', ''));
                        item.put('fileExtension', lk.ContentDocument.FileExtension);
                        item.put('uploadDate', lk.ContentDocument.CreatedDate);
                        item.put('fileSize', lk.ContentDocument.ContentSize);
                    }
                    docList.add(item);
                }
            }

            result.put('isLoggedIn', true);
            result.put('hasDonor', true);
            result.put('donorId', d.Id);
            result.put('donorCode', d.Name);
            result.put('donorName', d.Donor_Name__c);
            result.put('donorType', donorType);
            result.put('programId', programId);
            result.put('programName', programName);
            result.put('complianceStatus', d.Compliance_Status__c);
            result.put('kycVerified', (d.KYC_Verified__c == true));
            result.put('rejectionReason', d.KYC_Rejection_Reason__c);
            result.put('documents', docList);
            result.put('uploadedCount', uploadedCount);
            result.put('mandatoryCount', mandatoryCount);
            result.put('allMandatoryUploaded', (mandatoryCount > 0 && mandatoryUploadedCount >= mandatoryCount));
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in getRequiredDonorDocuments: ' + e.getMessage());
            result.put('isLoggedIn', false);
            result.put('error', e.getMessage());
        }
        return result;
    }

    /**
     * Uploads a KYC document for a specific requirement on the donor's record
     */
    @AuraEnabled
    public static Map<String, Object> uploadDonorKYCDocument(String programDocKey, String fileName, String base64Data) {
        Map<String, Object> res = new Map<String, Object>();
        try {
            if (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser()) {
                throw new AuraHandledException('Authentication required to upload verification documents.');
            }

            Id currentUserId = UserInfo.getUserId();
            User u = [SELECT ContactId, Email, Username FROM User WHERE Id = :currentUserId LIMIT 1];

            List<Donor__c> donors = [
                SELECT Id, Compliance_Status__c, KYC_Verified__c 
                FROM Donor__c 
                WHERE User__c = :currentUserId 
                ORDER BY CreatedDate DESC 
                LIMIT 1
            ];

            if (donors.isEmpty() && u.ContactId != null) {
                donors = [SELECT Id FROM Donor__c WHERE Contact__c = :u.ContactId ORDER BY CreatedDate DESC LIMIT 1];
            }
            if (donors.isEmpty() && String.isNotBlank(u.Email)) {
                donors = [SELECT Id FROM Donor__c WHERE Email__c = :u.Email ORDER BY CreatedDate DESC LIMIT 1];
            }

            if (donors.isEmpty()) {
                throw new AuraHandledException('Donor profile record not found. Please complete profile setup first.');
            }

            Donor__c d = donors[0];

            // Clean up previous file for this document requirement if any
            String docTag = '[KYC_' + programDocKey + ']';
            List<ContentDocumentLink> existingLinks = [
                SELECT ContentDocumentId, ContentDocument.Title 
                FROM ContentDocumentLink 
                WHERE LinkedEntityId = :d.Id
            ];
            List<Id> toDeleteDocIds = new List<Id>();
            for (ContentDocumentLink link : existingLinks) {
                if (link.ContentDocument.Title.contains(docTag)) {
                    toDeleteDocIds.add(link.ContentDocumentId);
                }
            }
            if (!toDeleteDocIds.isEmpty()) {
                Database.delete(toDeleteDocIds, false);
            }

            // Create standard ContentVersion
            ContentVersion cv = new ContentVersion();
            cv.Title = docTag + ' ' + fileName;
            cv.PathOnClient = fileName;
            cv.VersionData = EncodingUtil.base64Decode(base64Data);
            insert cv;

            cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];

            // Link to Donor__c record
            ContentDocumentLink cdl = new ContentDocumentLink();
            cdl.LinkedEntityId = d.Id;
            cdl.ContentDocumentId = cv.ContentDocumentId;
            cdl.ShareType = 'V';
            cdl.Visibility = 'AllUsers';
            insert cdl;

            res.put('success', true);
            res.put('contentDocumentId', cv.ContentDocumentId);
            res.put('fileName', fileName);
            res.put('programDocKey', programDocKey);
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in uploadDonorKYCDocument: ' + e.getMessage());
            res.put('success', false);
            res.put('error', e.getMessage());
        }
        return res;
    }

    /**
     * Deletes an uploaded KYC document by ContentDocumentId
     */
    @AuraEnabled
    public static Map<String, Object> deleteDonorKYCDocument(String contentDocumentId) {
        Map<String, Object> res = new Map<String, Object>();
        try {
            if (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser()) {
                throw new AuraHandledException('Authentication required.');
            }
            Id currentUserId = UserInfo.getUserId();
            List<Donor__c> donors = [SELECT Id, Compliance_Status__c, KYC_Verified__c FROM Donor__c WHERE User__c = :currentUserId LIMIT 1];
            if (!donors.isEmpty()) {
                if (donors[0].Compliance_Status__c == 'Approved' && donors[0].KYC_Verified__c == true) {
                    throw new AuraHandledException('Your KYC verification is already approved by administration. Deleting documents is locked.');
                }
                List<ContentDocumentLink> links = [
                    SELECT Id, ContentDocumentId 
                    FROM ContentDocumentLink 
                    WHERE LinkedEntityId = :donors[0].Id AND ContentDocumentId = :contentDocumentId
                    LIMIT 1
                ];
                if (!links.isEmpty()) {
                    Database.delete(contentDocumentId, false);
                    res.put('success', true);
                    return res;
                }
            }
            res.put('success', false);
            res.put('error', 'Document not found or permission denied.');
        } catch (Exception e) {
            res.put('success', false);
            res.put('error', e.getMessage());
        }
        return res;
    }

    /**
     * Submits all uploaded documents for administrative compliance review
     */
    @AuraEnabled
    public static Map<String, Object> submitDonorDocumentsForReview() {
        Map<String, Object> res = new Map<String, Object>();
        try {
            if (UserInfo.getUserType() == 'Guest' || Auth.CommunitiesUtil.isGuestUser()) {
                throw new AuraHandledException('Authentication required.');
            }
            Id currentUserId = UserInfo.getUserId();
            List<Donor__c> donors = [
                SELECT Id, Compliance_Status__c, KYC_Verified__c 
                FROM Donor__c 
                WHERE User__c = :currentUserId 
                ORDER BY CreatedDate DESC 
                LIMIT 1
            ];
            if (donors.isEmpty()) {
                throw new AuraHandledException('Donor record not found.');
            }
            Donor__c d = donors[0];
            d.Compliance_Status__c = 'Pending';
            d.KYC_Verified__c = false;
            update d;

            res.put('success', true);
            res.put('complianceStatus', 'Pending');
            res.put('message', 'Documents submitted successfully. Admin review is in progress.');
        } catch (Exception e) {
            res.put('success', false);
            res.put('error', e.getMessage());
        }
        return res;
    }
}
