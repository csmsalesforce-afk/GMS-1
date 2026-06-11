public with sharing class ApplicationReviewController {

    public class AppDetailsWrapper {
        @AuraEnabled public Grant_Applicant__c appRecord;
        @AuraEnabled public String currentUserProfile;
    }

    @AuraEnabled(cacheable=true)
    public static AppDetailsWrapper getApplicationDetails(Id appId){
        AppDetailsWrapper wrapper = new AppDetailsWrapper();
        
        Id profileId = UserInfo.getProfileId();
        Profile userProfile = [SELECT Name FROM Profile WHERE Id = :profileId LIMIT 1];
        wrapper.currentUserProfile = userProfile.Name;

        wrapper.appRecord = [
    SELECT
        Id, Name, Application_Status__c, Project_Title__c, Project_Description__c,
        Requested_Amount__c, Budget_Details__c, Submission_Date__c,
        Bank_Name_applicant__c, Bank_Account_Number_applicant__c,
        IFSC_SWIFT_Code_applicant__c, Tax_ID_applicant__c,

        // Reviewer Fields
        Reviewer_Score__c, Reviewer_Comments__c,

        // Program Officer Fields
        Eligibility_Score__c, Program_Alignment_Score__c, Budget_Compliance_Score__c, 
        Funding_Priority__c, External_Reviewer_Comments__c, Approval_Type__c, 

        // Account Fields (FIX 1)
        Account__r.Name,
        Account__r.Primary_Contact_Name__c,
        Account__r.Primary_Contact_Email__c,
        

        // Grant Program Fields (FIX 2)
        Grant_Program__r.Name,
        Grant_Program__r.Region__r.Name,
        Grant_Program__r.Organization_Type__c

    FROM Grant_Applicant__c
    WHERE Id = :appId
];

        return wrapper;
    }

    @AuraEnabled(cacheable=true)
    public static List<ContentDocumentLink> getFiles(Id recordId){
        return [
            SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.FileType,
                   ContentDocument.ContentSize, ContentDocument.LatestPublishedVersionId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :recordId
        ];
    }

    private static void processStandardApproval(Id recordId, String action, String comments) {
        List<ProcessInstanceWorkitem> workItems = [
            SELECT Id, ProcessInstanceId 
            FROM ProcessInstanceWorkitem 
            WHERE ProcessInstance.TargetObjectId = :recordId 
            LIMIT 1
        ];
        
        if (!workItems.isEmpty()) {
            Approval.ProcessWorkitemRequest req = new Approval.ProcessWorkitemRequest();
            req.setWorkitemId(workItems[0].Id);
            req.setAction(action); 
            req.setComments(comments);
            Approval.process(req); 
        }
    }

    // --- REVIEWER SAVE LOGIC ---
    @AuraEnabled
    public static void saveReviewerData(Id appId, String decision, Decimal score, String remarks) {
        try {
            Grant_Applicant__c appToUpdate = new Grant_Applicant__c(Id = appId);
            appToUpdate.Reviewer_Score__c = score;
            appToUpdate.Reviewer_Comments__c = remarks;
            
            if (decision == 'Reject') {
                appToUpdate.Application_Status__c = 'Rejected';
            } else if (decision == 'Approve') {
                appToUpdate.Application_Status__c = 'Under External Review';
            }
            update appToUpdate;

            processStandardApproval(appId, decision, remarks);

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // --- PROGRAM OFFICER SAVE LOGIC ---
   // Inside ApplicationReviewController.cls

@AuraEnabled
public static void saveProgramOfficerData(Id appId, String decision, Decimal eligScore, Decimal alignScore, Decimal budgetScore, String priority, String approvalType, String remarks) {
    try {
        // 1. Update the Grant Applicant Record
        Grant_Applicant__c appToUpdate = [SELECT Id, Name, Requested_Amount__c FROM Grant_Applicant__c WHERE Id = :appId LIMIT 1];
        
        // Setting status as per your requirement
        appToUpdate.Application_Status__c = 'Revision Requested';
        appToUpdate.Eligibility_Score__c = eligScore;
        appToUpdate.Program_Alignment_Score__c = alignScore;
        appToUpdate.Budget_Compliance_Score__c = budgetScore;
        appToUpdate.Funding_Priority__c = priority;
        appToUpdate.Approval_Type__c = approvalType;
        appToUpdate.External_Reviewer_Comments__c = remarks;
        update appToUpdate;

      

        // 3. Advance the Standard Approval Process
        processStandardApproval(appId, decision, remarks);

    } catch (Exception e) {
        throw new AuraHandledException('Error: ' + e.getMessage());
    }
}
}