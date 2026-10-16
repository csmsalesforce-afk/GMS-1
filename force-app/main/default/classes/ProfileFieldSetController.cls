public without sharing class ProfileFieldSetController {

    @AuraEnabled(cacheable=true)
    public static List<String> getFieldSetFields(String fieldSetName) {

        if(String.isBlank(fieldSetName)){
            return new List<String>();
        }

        Map<String, Schema.FieldSet> fieldSetMap =
            Grant_Program__c.SObjectType.getDescribe().fieldSets.getMap();

        if(!fieldSetMap.containsKey(fieldSetName)){
            return new List<String>();
        }

        List<String> fields = new List<String>();

        for(Schema.FieldSetMember f :
            fieldSetMap.get(fieldSetName).getFields()){

            fields.add(f.getFieldPath());
        }

        return fields;
    }

    public class Option {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
        public Option(String l, String v) { label = l; value = v; }
    }

    public class FieldMetadata {
        @AuraEnabled public String name;
        @AuraEnabled public String label;
        @AuraEnabled public String type;
        @AuraEnabled public Boolean required;
        @AuraEnabled public List<Option> options;
    }

    @AuraEnabled(cacheable=true)
    public static List<FieldMetadata> getFieldSetMetadata(String fieldSetName) {
        if(String.isBlank(fieldSetName)){
            return new List<FieldMetadata>();
        }

        Map<String, Schema.FieldSet> fieldSetMap =
            Grant_Program__c.SObjectType.getDescribe().fieldSets.getMap();

        Schema.FieldSet targetFs = null;
        for (String k : fieldSetMap.keySet()) {
            if (k.equalsIgnoreCase(fieldSetName)) {
                targetFs = fieldSetMap.get(k);
                break;
            }
        }

        if(targetFs == null){
            return new List<FieldMetadata>();
        }

        List<FieldMetadata> fields = new List<FieldMetadata>();

        for(Schema.FieldSetMember f : targetFs.getFields()){
            Schema.DescribeFieldResult dfr = f.getSObjectField().getDescribe();
            
            // Skip system, auto-number, and status fields (e.g. Id, OwnerId, RecordTypeId, Profile_Status__c, AutoNumber Profile ID)
            if (f.getFieldPath() == 'OwnerId' || f.getFieldPath() == 'Id' || f.getFieldPath() == 'RecordTypeId' || f.getFieldPath() == 'Profile_Status__c' || dfr.isAutoNumber()) {
                continue;
            }

            FieldMetadata md = new FieldMetadata();
            md.name = f.getFieldPath();
            md.label = f.getLabel();
            
            Schema.DisplayType t = f.getType();
            if (t == Schema.DisplayType.Picklist) {
                md.type = 'select';
                md.options = new List<Option>();
                for (Schema.PicklistEntry pe : dfr.getPicklistValues()) {
                    if (pe.isActive()) {
                        md.options.add(new Option(pe.getLabel(), pe.getValue()));
                    }
                }
            } else if (t == Schema.DisplayType.Reference) {
                md.type = 'select';
                md.options = new List<Option>();
                try {
                    Schema.SObjectType targetType = dfr.getReferenceTo()[0];
                    String targetName = targetType.getDescribe().getName();
                    String q = 'SELECT Id, Name FROM ' + String.escapeSingleQuotes(targetName) + ' ORDER BY Name ASC LIMIT 1000';
                    for (SObject sobj : Database.query(q)) {
                        md.options.add(new Option((String)sobj.get('Name'), (String)sobj.get('Id')));
                    }
                } catch (Exception e) {
                    System.debug('Failed to load lookup options: ' + e.getMessage());
                }
            } else if (t == Schema.DisplayType.Email) md.type = 'email';
            else if (t == Schema.DisplayType.Phone) md.type = 'tel';
            else if (t == Schema.DisplayType.Boolean) md.type = 'checkbox';
            else if (t == Schema.DisplayType.TextArea) md.type = 'textarea';
            else if (t == Schema.DisplayType.Double || t == Schema.DisplayType.Integer || t == Schema.DisplayType.Percent || t == Schema.DisplayType.Currency) md.type = 'number';
            else if (t == Schema.DisplayType.Date) md.type = 'date';
            else md.type = 'text';

            md.required = f.getRequired() || f.getDbRequired();
            fields.add(md);
        }

        return fields;
    }

    // Existing method (KEEP AS IS)
    @AuraEnabled(cacheable=true)
    public static Grant_Program__c getCurrentUserProfile() {
        
        List<String> allFields = new List<String>(Grant_Program__c.SObjectType.getDescribe().fields.getMap().keySet());
        
        String query = 'SELECT ' + String.join(allFields, ',') + 
                       ', Country__r.Name, Region__r.Name, Owner.Name ' +
                       'FROM Grant_Program__c ' +
                       'WHERE OwnerId = \'' + UserInfo.getUserId() + '\' ' +
                       'ORDER BY CreatedDate DESC ' +
                       'LIMIT 1';
        
        List<Grant_Program__c> profiles = Database.query(query);
        return profiles.isEmpty() ? null : profiles[0];
    }

    //  NEW METHOD FOR NAVBAR
    @AuraEnabled(cacheable=true)
    public static User getLoggedInUserProfile(){

        return [
            SELECT Id,
                   Name,
                   Profile.Name
            FROM User
            WHERE Id = :UserInfo.getUserId()
        ];
    }

    @AuraEnabled
    public static void submitProfileForApproval(Id recordId) {
        Approval.ProcessSubmitRequest req = new Approval.ProcessSubmitRequest();
        req.setObjectId(recordId);

        Approval.ProcessResult result = Approval.process(req);

        if (!result.isSuccess()) {
            throw new AuraHandledException('Unable to submit for approval.');
        }
    }

    // =========================================================================
    // DONOR PORTAL & CAMPAIGN APIS
    // =========================================================================

    /**
     * Fetch active campaigns for donors and guest users
     */
    @AuraEnabled(cacheable=true)
    public static List<Donor_Campaign__c> getActiveDonorCampaigns() {
        try {
            return [
                SELECT Id,
                       Name,
                       Status__c,
                       Active__c,
                       Type__c,
                       Description__c,
                       Start_Date__c,
                       End_Date__c,
                       Expected_Revenue_in_Campaign__c,
                       Budgeted_Cost_in_Campaign__c,
                       Actual_Cost_in_Campaign__c,
                       Program__c,
                       Program__r.Name
                FROM Donor_Campaign__c
                WHERE Active__c = true
                ORDER BY CreatedDate DESC
                LIMIT 50
            ];
        } catch (Exception ex) {
            // Fallback query without parent relation for guest users
            return [
                SELECT Id,
                       Name,
                       Status__c,
                       Active__c,
                       Type__c,
                       Description__c,
                       Start_Date__c,
                       End_Date__c,
                       Expected_Revenue_in_Campaign__c,
                       Budgeted_Cost_in_Campaign__c,
                       Actual_Cost_in_Campaign__c,
                       Program__c
                FROM Donor_Campaign__c
                WHERE Active__c = true
                ORDER BY CreatedDate DESC
                LIMIT 50
            ];
        }
    }

    /**
     * Create a Donation record in Donations__c directly when donor clicks "Donate Now"
     */
    @AuraEnabled
    public static Donations__c createDonation(Id campaignId, Decimal amount, String donorName, String donorEmail, String donorPhone, String donorMessage) {
        if (amount == null || amount <= 0) {
            throw new AuraHandledException('Donation amount must be greater than zero.');
        }

        Donations__c d = new Donations__c();
        d.Donor_Campaign__c = campaignId;
        d.Donation_Amount__c = amount;
        d.Donor_Name__c = String.isNotBlank(donorName) ? donorName : UserInfo.getName();
        d.Donor_Email__c = String.isNotBlank(donorEmail) ? donorEmail : UserInfo.getUserEmail();
        d.Donor_Phone__c = donorPhone;
        d.Donor_Message__c = donorMessage;
        d.Payment_Status__c = 'Successful';
        d.Payment_Date__c = System.now();
        d.Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').left(8);

        insert d;
        return d;
    }

    /**
     * DTO for Signed-in Donor Dashboard
     */
    public class DonorDashboardSummary {
        @AuraEnabled public Decimal totalDonations;
        @AuraEnabled public Integer campaignsSupported;
        @AuraEnabled public Integer totalTransactions;
        @AuraEnabled public List<Donations__c> recentDonations;
        @AuraEnabled public String profileStatus;
        @AuraEnabled public Boolean isApproved;
    }

    /**
     * Get summary metrics and donation history for signed-in donor
     */
    @AuraEnabled(cacheable=true)
    public static DonorDashboardSummary getDonorDashboardSummary() {
        DonorDashboardSummary summary = new DonorDashboardSummary();
        summary.totalDonations = 0;
        summary.campaignsSupported = 0;
        summary.totalTransactions = 0;
        summary.recentDonations = new List<Donations__c>();

        // Check user profile status
        Grant_Program__c profile = getCurrentUserProfile();
        summary.profileStatus = profile != null ? profile.Profile_Status__c : 'Pending';
        summary.isApproved = profile != null && profile.Profile_Status__c == 'Approved';

        String userEmail = UserInfo.getUserEmail();

        List<Donations__c> donations = [
            SELECT Id,
                   Name,
                   Donation_Amount__c,
                   Donor_Campaign__c,
                   Donor_Campaign__r.Name,
                   Donor_Name__c,
                   Donor_Email__c,
                   Payment_Status__c,
                   Payment_Date__c,
                   Receipt_Number__c,
                   Donor_Message__c
            FROM Donations__c
            WHERE Donor_Email__c = :userEmail
            ORDER BY Payment_Date__c DESC NULLS LAST
            LIMIT 50
        ];

        summary.recentDonations = donations;
        summary.totalTransactions = donations.size();

        Set<Id> campaignIds = new Set<Id>();
        for (Donations__c d : donations) {
            if (d.Donation_Amount__c != null && d.Payment_Status__c == 'Successful') {
                summary.totalDonations += d.Donation_Amount__c;
            }
            if (d.Donor_Campaign__c != null) {
                campaignIds.add(d.Donor_Campaign__c);
            }
        }
        summary.campaignsSupported = campaignIds.size();

        return summary;
    }
}