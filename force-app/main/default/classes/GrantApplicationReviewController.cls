public with sharing class GrantApplicationReviewController {

    @AuraEnabled(cacheable=true)
    public static Map<String,Object> getApplicationData(Id applicationId){

        Map<String,Object> result = new Map<String,Object>();

        Grant_Applicant__c app = [
            SELECT Id, Name, Application_Status__c,
            Project_Title__c,
            Project_Description__c,
            Requested_Amount__c,

            Reviewer_Score__c,
            Reviewer_Comments__c,

            Eligibility_Score__c,
            Program_Alignment_Score__c,
            Budget_Compliance_Score__c,
            Funding_Priority__c,

            External_Reviewer_Comments__c,

            Approved_Amount__c
            FROM Grant_Applicant__c
            WHERE Id =:applicationId
        ];

        List<ContentDocumentLink> docs = [
            SELECT ContentDocumentId,
                   ContentDocument.Title,
                   ContentDocument.FileType,
                   ContentDocument.ContentSize
            FROM ContentDocumentLink
            WHERE LinkedEntityId =:applicationId
        ];

        List<ProcessInstanceStep> history = [
            SELECT StepStatus, Comments,
                   Actor.Name, CreatedDate
            FROM ProcessInstanceStep
            WHERE ProcessInstance.TargetObjectId =:applicationId
            ORDER BY CreatedDate DESC
        ];

        User u = [
            SELECT Profile.Name
            FROM User
            WHERE Id =:UserInfo.getUserId()
        ];

        result.put('application',app);
        result.put('documents',docs);
        result.put('history',history);
        result.put('profile',u.Profile.Name);

        return result;
    }
}