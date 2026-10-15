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
        try {
            Id userId = UserInfo.getUserId();

            // 🔹 Fetch user's Profile (Grant_Program__c)
            List<Grant_Program__c> userProfiles = [
                SELECT Id, Account__c
                FROM Grant_Program__c
                WHERE OwnerId = :userId
                LIMIT 1
            ];

            if (userProfiles.isEmpty()) {
                throw new AuraHandledException('No profile found for this user. Please complete your profile first.');
            }
            Grant_Program__c userProfile = userProfiles[0];
            
            User currentUser = [SELECT Name FROM User WHERE Id = :userId LIMIT 1];

            if (String.isBlank(app.Applicant_Name__c)) {
                app.Applicant_Name__c = currentUser.Name;
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
        } catch (DmlException e) {
            String errorMsg = e.getDmlMessage(0);
            AuraHandledException auraEx = new AuraHandledException(errorMsg);
            auraEx.setMessage(errorMsg);
            throw auraEx;
        } catch (Exception e) {
            String errorMsg = e.getMessage();
            AuraHandledException auraEx = new AuraHandledException(errorMsg);
            auraEx.setMessage(errorMsg);
            throw auraEx;
        }
    }


    @AuraEnabled
    public static void submitApplication(Id appId){
        try {
            Grant_Applicant__c app = [
                SELECT Id, Start_Date__c FROM Grant_Applicant__c
                WHERE Id = :appId
            ];

            app.Application_Status__c = 'Submitted';
            app.Submission_Date__c = Date.today();
            if (app.Start_Date__c != null) {
                app.End_Date__c = app.Start_Date__c.addDays(30);
            } else {
                app.End_Date__c = Date.today().addDays(30);
            }
            update app;
        } catch (DmlException e) {
            String errorMsg = e.getDmlMessage(0);
            AuraHandledException auraEx = new AuraHandledException(errorMsg);
            auraEx.setMessage(errorMsg);
            throw auraEx;
        } catch (Exception e) {
            String errorMsg = e.getMessage();
            AuraHandledException auraEx = new AuraHandledException(errorMsg);
            auraEx.setMessage(errorMsg);
            throw auraEx;
        }
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
public static Map<String, Object> getApplication(Id recordId) {

    Grant_Applicant__c app = [
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

            /* Program Officer */
            Program_Officer__c,
            Program_Officer__r.Name,

            /* Financer & Finance Details */
            Financer__c,
            Financer__r.Name,
            Invoice_Created__c,
            Awards_Created__c,
            Installment_Percentage__c,
            Number_of_Installments__c,
            Total_Funding_Request__c,

            /* Status & System */
            PDF_Generated__c,
            Reason_For_Withdrawn__c,
            Reason_For_Rejected__c,
            Withdraw_Date__c,
            Technical_Feasibility__c,

            /* Lookup */
            Program__r.Name,
            Program__r.Max_Amount__c,
            Program__r.Program_Type__c,

            /* Project Budgets */
            (
                SELECT Id, Name, Expense_Category__c, Other_Category__c, Description__c, Estimated_Amount__c 
                FROM Project_Budgets__r 
                ORDER BY CreatedDate ASC
            )

        FROM Grant_Applicant__c
        WHERE Id = :recordId
        LIMIT 1
    ];

    Map<String, Object> appMap = (Map<String, Object>) JSON.deserializeUntyped(JSON.serialize(app));
    appMap.put('projectBudgets', app.Project_Budgets__r);

    // Resolve real User names (bypassing community nickname masking)
    Set<Id> userIds = new Set<Id>();
    if (app.Reviewer_Assigned__c != null) userIds.add(app.Reviewer_Assigned__c);
    if (app.Program_Officer__c != null) userIds.add(app.Program_Officer__c);
    if (app.Financer__c != null) userIds.add(app.Financer__c);

    Map<Id, String> nameMap = UserResolver.getUserFullNames(userIds);

    if (app.Reviewer_Assigned__c != null && nameMap.containsKey(app.Reviewer_Assigned__c)) {
        String rName = nameMap.get(app.Reviewer_Assigned__c);
        appMap.put('reviewerName', rName);
        Map<String, Object> rObj = (Map<String, Object>) appMap.get('Reviewer_Assigned__r');
        if (rObj == null) {
            rObj = new Map<String, Object>();
            appMap.put('Reviewer_Assigned__r', rObj);
        }
        rObj.put('Name', rName);
    }

    if (app.Program_Officer__c != null && nameMap.containsKey(app.Program_Officer__c)) {
        String poName = nameMap.get(app.Program_Officer__c);
        appMap.put('programOfficerName', poName);
        Map<String, Object> poObj = (Map<String, Object>) appMap.get('Program_Officer__r');
        if (poObj == null) {
            poObj = new Map<String, Object>();
            appMap.put('Program_Officer__r', poObj);
        }
        poObj.put('Name', poName);
    }

    if (app.Financer__c != null && nameMap.containsKey(app.Financer__c)) {
        String fName = nameMap.get(app.Financer__c);
        appMap.put('financerName', fName);
        Map<String, Object> fObj = (Map<String, Object>) appMap.get('Financer__r');
        if (fObj == null) {
            fObj = new Map<String, Object>();
            appMap.put('Financer__r', fObj);
        }
        fObj.put('Name', fName);
    }

    return appMap;
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

        // 5️⃣ Update Application
        Grant_Applicant__c app = new Grant_Applicant__c(
            Id = recordId,
            PDF_Generated__c = true,
            Application_Status__c = 'Submitted',
            Submission_Date__c = Date.today()
        );

        update app;

        // 6️⃣ Enter Approval Process
        try {
            Approval.ProcessSubmitRequest req = new Approval.ProcessSubmitRequest();
            req.setComments('Submitted from Applicant Portal.');
            req.setObjectId(recordId);
            Approval.process(req);
        } catch(Exception e) {
            System.debug('Approval Process Submission Error: ' + e.getMessage());
        }

    } catch (Exception e) {
        throw new AuraHandledException(e.getMessage());
    }
}

@AuraEnabled
public static String generateApplicantPdf(Id recordId) {
    try {
        if (recordId == null) {
            throw new AuraHandledException('Record ID is required.');
        }

        PageReference pdfPage = Page.GrantApplication;
        pdfPage.getParameters().put('id', recordId);
        Blob pdfBlob;
        if (Test.isRunningTest()) {
            pdfBlob = Blob.valueOf('Fake Test PDF Body');
        } else {
            pdfBlob = pdfPage.getContentAsPDF();
        }

        Grant_Applicant__c app = [
            SELECT Id, Name, Applicant_Name__c 
            FROM Grant_Applicant__c 
            WHERE Id = :recordId 
            LIMIT 1
        ];

        String fileTitle = 'Grant_Application_' + (String.isNotBlank(app.Name) ? app.Name : String.valueOf(recordId));

        ContentVersion cv = new ContentVersion();
        cv.Title = fileTitle;
        cv.PathOnClient = 'GrantApplication.pdf';
        cv.VersionData = pdfBlob;
        insert cv;

        cv = [
            SELECT Id, ContentDocumentId 
            FROM ContentVersion 
            WHERE Id = :cv.Id 
            LIMIT 1
        ];

        List<ContentDocumentLink> existingLinks = [
            SELECT Id 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId = :recordId 
              AND ContentDocumentId = :cv.ContentDocumentId 
            LIMIT 1
        ];

        if (existingLinks.isEmpty()) {
            ContentDocumentLink cdl = new ContentDocumentLink();
            cdl.LinkedEntityId = recordId;
            cdl.ContentDocumentId = cv.ContentDocumentId;
            cdl.ShareType = 'V';
            cdl.Visibility = 'AllUsers';
            insert cdl;
        }

        update new Grant_Applicant__c(
            Id = recordId,
            PDF_Generated__c = true
        );

        return cv.ContentDocumentId;
    } catch (Exception e) {
        throw new AuraHandledException('Error generating PDF: ' + e.getMessage());
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
    
@AuraEnabled
public static List<Map<String, Object>> getApplicationFiles(Id recordId) {

    // Get all ContentDocumentIds linked to this record
    List<ContentDocumentLink> links = [
        SELECT ContentDocumentId
        FROM ContentDocumentLink
        WHERE LinkedEntityId = :recordId
    ];

    Set<Id> docIds = new Set<Id>();
    for (ContentDocumentLink cdl : links) {
        docIds.add(cdl.ContentDocumentId);
    }

    if (docIds.isEmpty()) {
        return new List<Map<String, Object>>();
    }

    List<ContentVersion> versions = [
        SELECT Id,
               Title,
               ContentDocumentId,
               FileExtension,
               CreatedDate
        FROM ContentVersion
        WHERE ContentDocumentId IN :docIds
          AND IsLatest = true
        ORDER BY CreatedDate DESC
    ];

    List<Map<String, Object>> fileList = new List<Map<String, Object>>();

    for(ContentVersion cv : versions) {

        Map<String, Object> fileMap = new Map<String, Object>();
        fileMap.put('versionId', cv.Id);
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

    // ============================================
    // UPLOAD FILE (From React Portal)
    // ============================================
    @AuraEnabled
    public static String uploadFile(String fileName, String base64Data, Id recordId) {
        try {
            // 1️⃣ Create ContentVersion (without FirstPublishLocationId for better compatibility)
            ContentVersion cv = new ContentVersion();
            cv.Title = fileName;
            cv.PathOnClient = fileName;
            cv.VersionData = EncodingUtil.base64Decode(base64Data);
            insert cv;

            // 2️⃣ Get ContentDocumentId
            cv = [
                SELECT Id, ContentDocumentId
                FROM ContentVersion
                WHERE Id = :cv.Id
                LIMIT 1
            ];

            // 3️⃣ Link File to the Application record
            ContentDocumentLink cdl = new ContentDocumentLink();
            cdl.LinkedEntityId = recordId;
            cdl.ContentDocumentId = cv.ContentDocumentId;
            cdl.ShareType = 'V';
            cdl.Visibility = 'AllUsers';
            insert cdl;

            return cv.ContentDocumentId;

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // ============================================
    // DELETE FILE (From React Portal)
    // ============================================
    @AuraEnabled
    public static void deleteFile(Id documentId) {
        try {
            ContentDocument doc = [
                SELECT Id FROM ContentDocument WHERE Id = :documentId LIMIT 1
            ];
            delete doc;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // ============================================
    // PROJECT BUDGET METHODS
    // ============================================
    @AuraEnabled
    public static List<Project_Budget__c> getProjectBudgets(Id applicationId) {
        try {
            return [
                SELECT Id, Name, Expense_Category__c, Other_Category__c, Description__c, Estimated_Amount__c
                FROM Project_Budget__c
                WHERE Grant_Applicant__c = :applicationId
                ORDER BY CreatedDate ASC
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static List<Project_Budget__c> saveProjectBudgets(Id applicationId, String budgetJson) {
        try {
            if (applicationId == null) {
                throw new AuraHandledException('Application ID is required to save budget items.');
            }

            List<Object> rawList = String.isNotBlank(budgetJson) 
                ? (List<Object>) JSON.deserializeUntyped(budgetJson) 
                : new List<Object>();

            List<Project_Budget__c> existingBudgets = [
                SELECT Id 
                FROM Project_Budget__c 
                WHERE Grant_Applicant__c = :applicationId
            ];
            Set<Id> existingIds = new Map<Id, Project_Budget__c>(existingBudgets).keySet();
            Set<Id> retainedIds = new Set<Id>();

            List<Project_Budget__c> toUpsert = new List<Project_Budget__c>();

            for (Object obj : rawList) {
                Map<String, Object> row = (Map<String, Object>) obj;
                Project_Budget__c pb = new Project_Budget__c();

                if (row.containsKey('Id') && row.get('Id') != null && String.isNotBlank(String.valueOf(row.get('Id')))) {
                    pb.Id = (Id) String.valueOf(row.get('Id'));
                    retainedIds.add(pb.Id);
                }
                pb.Grant_Applicant__c = applicationId;
                pb.Expense_Category__c = row.containsKey('Expense_Category__c') && row.get('Expense_Category__c') != null 
                    ? String.valueOf(row.get('Expense_Category__c')) : null;
                pb.Other_Category__c = row.containsKey('Other_Category__c') && row.get('Other_Category__c') != null 
                    ? String.valueOf(row.get('Other_Category__c')) : null;
                pb.Description__c = row.containsKey('Description__c') && row.get('Description__c') != null 
                    ? String.valueOf(row.get('Description__c')) : null;

                if (row.containsKey('Estimated_Amount__c') && row.get('Estimated_Amount__c') != null) {
                    String amtStr = String.valueOf(row.get('Estimated_Amount__c'));
                    if (String.isNotBlank(amtStr)) {
                        pb.Estimated_Amount__c = Decimal.valueOf(amtStr);
                    }
                }
                toUpsert.add(pb);
            }

            // Remove deleted items
            List<Project_Budget__c> toDelete = new List<Project_Budget__c>();
            for (Id oldId : existingIds) {
                if (!retainedIds.contains(oldId)) {
                    toDelete.add(new Project_Budget__c(Id = oldId));
                }
            }
            if (!toDelete.isEmpty()) {
                delete toDelete;
            }

            if (!toUpsert.isEmpty()) {
                upsert toUpsert;
            }

            return [
                SELECT Id, Name, Expense_Category__c, Other_Category__c, Description__c, Estimated_Amount__c
                FROM Project_Budget__c
                WHERE Grant_Applicant__c = :applicationId
                ORDER BY CreatedDate ASC
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}