public without sharing class GrantApplicationController1 {

    @AuraEnabled
public static void withdrawApplicationWithNotification(Id recordId, String reason) {

    try {

        // ============================
        // 1️⃣ Fetch Application
        // ============================

        Grant_Applicant__c app = [
            SELECT Id, Name, OwnerId
            FROM Grant_Applicant__c
            WHERE Id = :recordId
            LIMIT 1
        ];

        if (UserInfo.getUserId() != app.OwnerId) {
            throw new AuraHandledException('You are not authorized to withdraw this application.');
        }

        // ============================
        // 2️⃣ UPDATE RECORD FIRST 🔥
        // ============================

        Grant_Applicant__c updateApp = new Grant_Applicant__c(
            Id = recordId,
            Application_Status__c = 'Withdrawn',
            Reason_For_Withdrawn__c = reason,
            Withdraw_Date__c = Date.today()
        );

        update updateApp;

        // ============================
        // 3️⃣ Remove From Approval
        // ============================

        List<ProcessInstance> piList = [
            SELECT Id
            FROM ProcessInstance
            WHERE TargetObjectId = :recordId
            AND Status = 'Pending'
            LIMIT 1
        ];

        if (!piList.isEmpty()) {

            ProcessInstanceWorkitem workItem = [
                SELECT Id
                FROM ProcessInstanceWorkitem
                WHERE ProcessInstanceId = :piList[0].Id
                LIMIT 1
            ];

            Approval.ProcessWorkitemRequest req = new Approval.ProcessWorkitemRequest();
            req.setWorkitemId(workItem.Id);
            req.setAction('Removed');
            req.setComments('Application withdrawn by applicant.');

            Approval.process(req);
        }

    } catch (Exception e) {
        throw new AuraHandledException(e.getMessage());
    }
}
   // ============================================
    // SAVE APPLICATION (Auto-Assign Profile + Account)
    // ============================================
    @AuraEnabled
    public static Id saveApplication(Grant_Applicant__c app) {

        Id userId = UserInfo.getUserId();

        // 🔹 Fetch user's Profile (Grant_Program__c)
        Grant_Program__c userProfile = [
            SELECT Id, Account__c
            FROM Grant_Program__c
            WHERE OwnerId = :userId
            LIMIT 1
        ];

        if (userProfile == null) {
            throw new AuraHandledException('No profile found for this user.');
        }

        if (app.Id == null) {

            app.Application_Status__c = 'Draft';

            // 🔹 Auto-assign profile
            app.Grant_Program__c = userProfile.Id;

            // 🔹 Auto-assign account
            app.Account__c = userProfile.Account__c;

            insert app;

        } else {
            update app;
        }

        return app.Id;
    }


    @AuraEnabled
    public static void submitApplication(Id appId){

        Grant_Applicant__c app = [
            SELECT Id FROM Grant_Applicant__c
            WHERE Id = :appId
        ];

        app.Application_Status__c = 'Submitted';
        app.Submission_Date__c = Date.today();
        app.End_Date__c = Date.today() + 30;
        update app;
    }
    @AuraEnabled(cacheable=true)
public static User getApplicantInfo() {
    return [
        SELECT Id, Name
        FROM User
        WHERE Id = :UserInfo.getUserId()
    ];
}

@AuraEnabled(cacheable=true)
public static Program__c getProgramInfo(Id programId) {
    return [
        SELECT Id, Name
        FROM Program__c
        WHERE Id = :programId
        LIMIT 1
    ];
}
    
@AuraEnabled
public static Grant_Applicant__c getApplication(Id recordId) {

    return [
        SELECT 
            Id,
            Name,
            Application_Status__c,
            Application_Version__c,
            Submission_Date__c,
            Approval_Type__c,
            Approved_Amount__c,
            Resubmission_Count__c,

            /* Applicant Info */
            Applicant_Name__c,
            Region__c,
            Country__c,
            Bank_Account_Number_applicant__c,
            Bank_Name_applicant__c,
            IFSC_SWIFT_Code_applicant__c,
            Tax_ID_applicant__c,

            /* Project Info */
            Project_Title__c,
            Project_Description__c,
            Requested_Amount__c,
            Budget_Details__c,
            Start_Date__c,
            End_Date__c,

            /* Review Info */
            Reviewer_Assigned__c,
Reviewer_Assigned__r.Name,
            Reviewer_Recommendation__c,
            Reviewer_Score__c,
            Reviewer_Comments__c,
            Risk_Level__c,

            /* SLA Info */
            Reviewer_SLA_Start__c,
            Reviewer_SLA_End__c,
            Reviewer_SLA_Duration_Hours__c,
            SLA_Breached__c,

            /* External Review */
            External_Reviewer_Score__c,
            External_Reviewer_Comments__c,
            Eligibility_Score__c,
            Program_Alignment_Score__c,
            Budget_Compliance_Score__c,
            Funding_Priority__c,

            /* Lookup */
            Program__r.Name

        FROM Grant_Applicant__c
        WHERE Id = :recordId
        LIMIT 1
    ];
}

@AuraEnabled
public static void submitForApproval(Id recordId) {
    Grant_Applicant__c app = [SELECT Id FROM Grant_Applicant__c WHERE Id = :recordId];
    app.Application_Status__c = 'Submitted';
    update app;
}

     // 🔹 Load Application
    @AuraEnabled(cacheable=true)
    public static Grant_Applicant__c getApplication1(Id recordId) {

        return [
            SELECT Name,
                   Applicant_Name__c,
                   Application_Status__c,
                   Region__c,
                   Country__c,
                   Project_Title__c,
                   Project_Description__c,
                   Start_Date__c,
                   End_Date__c,
                   Requested_Amount__c,
                   Submission_Date__c,
                   Grant_Program__r.Name
            FROM Grant_Applicant__c
            WHERE Id = :recordId
            LIMIT 1
        ];
    }
    
@AuraEnabled
public static void generatePdfAndSubmit(Id recordId) {

    try {

        // 1️⃣ Generate PDF
        PageReference pdfPage = Page.GrantApplication;
        pdfPage.getParameters().put('id', recordId);
        Blob pdfBlob = pdfPage.getContentAsPDF();

        // 2️⃣ Create File (ContentVersion)
        ContentVersion cv = new ContentVersion();
        cv.Title = 'Grant_Application_' + recordId;
        cv.PathOnClient = 'GrantApplication.pdf';
        cv.VersionData = pdfBlob;
        insert cv;

        // 3️⃣ Get ContentDocumentId
        cv = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion
            WHERE Id = :cv.Id
            LIMIT 1
        ];

        // 4️⃣ Link File to Grant Application (CRITICAL FIX)
        ContentDocumentLink cdl = new ContentDocumentLink();
        cdl.LinkedEntityId = recordId;
        cdl.ContentDocumentId = cv.ContentDocumentId;
        cdl.ShareType = 'V';          // Viewer
        cdl.Visibility = 'AllUsers';  // VERY IMPORTANT FOR EXPERIENCE CLOUD
        insert cdl;

        // 5️⃣ Update Application (Triggers Approval)
        Grant_Applicant__c app = new Grant_Applicant__c(
            Id = recordId,
            PDF_Generated__c = true,
            Application_Status__c = 'Submitted',
            Submission_Date__c = Date.today()
        );

        update app;

    } catch (Exception e) {
        throw new AuraHandledException(e.getMessage());
    }
}
    
    @AuraEnabled
public static void withdrawApplicationWithReason(Id recordId, String reason) {

    try {

        // 🔹 Check if record is in approval
        List<ProcessInstance> piList = [
            SELECT Id
            FROM ProcessInstance
            WHERE TargetObjectId = :recordId
            AND Status = 'Pending'
            LIMIT 1
        ];

        if (!piList.isEmpty()) {

            // 🔹 Remove from approval process
            Approval.ProcessWorkitemRequest req = new Approval.ProcessWorkitemRequest();
            
            ProcessInstanceWorkitem workItem = [
                SELECT Id
                FROM ProcessInstanceWorkitem
                WHERE ProcessInstanceId = :piList[0].Id
                LIMIT 1
            ];

            req.setWorkitemId(workItem.Id);
            req.setAction('Removed');
            req.setComments('Application withdrawn by applicant.');

            Approval.process(req);
        }

        // 🔹 Update record
        Grant_Applicant__c app = new Grant_Applicant__c(
            Id = recordId,
            Application_Status__c = 'Withdrawn',
            Reason_For_Withdrawn__c = reason
        );

        update app;

    } catch (Exception e) {
        throw new AuraHandledException(e.getMessage());
    }
}
    
    @AuraEnabled(cacheable=true)
    public static Map<String, Id> getUserContext() {

        Id userId = UserInfo.getUserId();

        // Get User Account
        User u = [
            SELECT Id, Contact.AccountId
            FROM User
            WHERE Id = :userId
            LIMIT 1
        ];

        
        Grant_Program__c prof = [
            SELECT Id, Account__c
            FROM Grant_Program__c
            WHERE OwnerId = :userId
            LIMIT 1
        ];

        Map<String, Id> result = new Map<String, Id>();
        result.put('profileId', prof.Id);
        result.put('accountId', prof.Account__c);

        return result;
    }
    @AuraEnabled(cacheable=true)
public static String getProfileStatus() {

    Id userId = UserInfo.getUserId();

    List<Grant_Program__c> profiles = [
        SELECT Id, Profile_Status__c
        FROM Grant_Program__c
        WHERE OwnerId = :userId
        LIMIT 1
    ];

    if (profiles.isEmpty()) {
        return 'NO_PROFILE';
    }

    return profiles[0].Profile_Status__c;
}
    
@AuraEnabled(cacheable=true)
public static List<Map<String, Object>> getApplicationFiles(Id recordId) {

    List<ContentVersion> versions = [
        SELECT Id,
               Title,
               ContentDocumentId,
               FileExtension,
               CreatedDate
        FROM ContentVersion
        WHERE FirstPublishLocationId = :recordId
        ORDER BY CreatedDate DESC
    ];

    List<Map<String, Object>> fileList = new List<Map<String, Object>>();

    for(ContentVersion cv : versions) {

        Map<String, Object> fileMap = new Map<String, Object>();
        fileMap.put('versionId', cv.Id); // IMPORTANT
        fileMap.put('documentId', cv.ContentDocumentId);
        fileMap.put('title', cv.Title);
        fileMap.put('extension', cv.FileExtension);
        fileMap.put('createdDate', cv.CreatedDate);

        fileList.add(fileMap);
    }

    return fileList;
}

public class FileWrapper {
    @AuraEnabled public String documentId;
    @AuraEnabled public String title;
    @AuraEnabled public String fileType;
    @AuraEnabled public Datetime createdDate;

    public FileWrapper(String documentId, String title, String fileType, Datetime createdDate){
        this.documentId = documentId;
        this.title = title;
        this.fileType = fileType;
        this.createdDate = createdDate;
    }
}
    
@AuraEnabled(cacheable=true)
public static List<ContentDocumentLink> getUploadedFiles(Id recordId) {

    return [
        SELECT Id,
               ContentDocumentId,
               ContentDocument.Title,
               ContentDocument.FileExtension,
               ContentDocument.LatestPublishedVersionId
        FROM ContentDocumentLink
        WHERE LinkedEntityId = :recordId
    ];
}
    
    @AuraEnabled
public static void fixFileVisibility(Id documentId) {

    List<ContentDocumentLink> links = [
        SELECT Id, Visibility
        FROM ContentDocumentLink
        WHERE ContentDocumentId = :documentId
    ];

    for(ContentDocumentLink link : links) {
        link.Visibility = 'AllUsers';
    }

    update links;
}
}