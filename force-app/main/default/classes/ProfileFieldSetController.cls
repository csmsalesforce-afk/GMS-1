public with sharing class ProfileFieldSetController {

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

    // Existing method (KEEP AS IS)
    @AuraEnabled(cacheable=true)
    public static Grant_Program__c getCurrentUserProfile() {

        return [
            SELECT Id,
                   Name,
                   Organization_Type__c,
                   Profile_Status__c
            FROM Grant_Program__c
            WHERE OwnerId = :UserInfo.getUserId()
            LIMIT 1
        ];
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
}