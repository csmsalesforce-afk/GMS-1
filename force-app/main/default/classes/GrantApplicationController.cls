public with sharing class GrantApplicationController {

    @AuraEnabled(cacheable=true)
    public static List<Grant_Applicant__c> getApplications() {
        return [
            SELECT Id, Name, Application_Status__c, Requested_Amount__c
            FROM Grant_Applicant__c
            ORDER BY CreatedDate DESC
        ];
    }
}