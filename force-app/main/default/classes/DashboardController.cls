public with sharing class DashboardController {

    @AuraEnabled(cacheable=true)
    public static String getProfileStatus() {

        List<Grant_Program__c> profiles = [
            SELECT Profile_Status__c
            FROM Grant_Program__c
            WHERE OwnerId = :UserInfo.getUserId()
            LIMIT 1
        ];

        if(profiles.isEmpty()){
            return null;
        }

        return profiles[0].Profile_Status__c;
    }
}