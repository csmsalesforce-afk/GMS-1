public with sharing class MyApplicationsController {

    @AuraEnabled(cacheable=true)
    public static List<Grant_Applicant__c> getMyApplications() {

        return [
            SELECT Id,
                   Name,
                   Program__r.Name,
                   Project_Title__c,
                   Approved_Amount__c,
                   Requested_Amount__c,
                   Application_Status__c
            FROM Grant_Applicant__c
            WHERE OwnerId = :UserInfo.getUserId()
            ORDER BY CreatedDate DESC
        ];
    }
}