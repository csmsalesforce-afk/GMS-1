public with sharing class FundUtilizationController {

    /* ================= GET DISBURSEMENT ================= */
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getApplicantAndDisbursement(Id applicationId) {

        Map<String, Object> result = new Map<String, Object>();

        List<Disbursement__c> disbList = [
            SELECT Id, Name, Status__c,
                   Installment__r.Funding_Allocation__r.Grant_Applicant__c,
                   Installment__r.Funding_Allocation__r.Grant_Applicant__r.Name
            FROM Disbursement__c
            WHERE Installment__r.Funding_Allocation__r.Grant_Applicant__c = :applicationId
            AND Status__c = 'Paid'
            LIMIT 1
        ];

        if (!disbList.isEmpty()) {

            Disbursement__c d = disbList[0];

            result.put('hasDisbursement', true);
            result.put('disbursementId', d.Id);
            result.put('disbursementName', d.Name);
            result.put('applicationName',
                d.Installment__r.Funding_Allocation__r.Grant_Applicant__r.Name
            );
            result.put(
                'applicationId',
                d.Installment__r.Funding_Allocation__r.Grant_Applicant__c
            );

        } else {
            result.put('hasDisbursement', false);
        }

        return result;
    }

    /* ================= LINK FILES ================= */
    @AuraEnabled
    public static void linkFilesToRecord(Id recordId, List<Id> fileIds) {

        List<ContentDocumentLink> links = new List<ContentDocumentLink>();

        for (Id fileId : fileIds) {
            links.add(new ContentDocumentLink(
                ContentDocumentId = fileId,
                LinkedEntityId = recordId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            ));
        }

        insert links;
    }

    /* ================= GET FILES WITH DISBURSEMENT ================= */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getApplicationDisbrustmentFiles(Id applicationId) {

        List<Map<String, Object>> result = new List<Map<String, Object>>();

        // Step 1: Get file links
        List<ContentDocumentLink> links = [
            SELECT 
                ContentDocumentId,
                ContentDocument.Title,
                ContentDocument.CreatedDate,
                LinkedEntityId
            FROM ContentDocumentLink
            WHERE LinkedEntityId IN (
                SELECT Id 
                FROM Fund_Utilization__c
                WHERE Grant_Applicant__c = :applicationId
            )
        ];

        // Step 2: Get Fund Utilization records
        Set<Id> fuIds = new Set<Id>();
        for (ContentDocumentLink link : links) {
            fuIds.add(link.LinkedEntityId);
        }

        Map<Id, Fund_Utilization__c> fuMap = new Map<Id, Fund_Utilization__c>(
            [
                SELECT Id, Disbursement__c
                FROM Fund_Utilization__c
                WHERE Id IN :fuIds
            ]
        );

        // Step 3: Get Disbursement Names
        Set<Id> disbIds = new Set<Id>();
        for (Fund_Utilization__c fu : fuMap.values()) {
            if (fu.Disbursement__c != null) {
                disbIds.add(fu.Disbursement__c);
            }
        }

        Map<Id, Disbursement__c> disbMap = new Map<Id, Disbursement__c>(
            [SELECT Id, Name FROM Disbursement__c WHERE Id IN :disbIds]
        );

        // Step 4: Prepare result
        for (ContentDocumentLink link : links) {

            Fund_Utilization__c fu = fuMap.get(link.LinkedEntityId);

            String disbName = 'No Disbursement';

            if (fu != null && fu.Disbursement__c != null && disbMap.containsKey(fu.Disbursement__c)) {
                disbName = disbMap.get(fu.Disbursement__c).Name;
            }

            Map<String, Object> fileMap = new Map<String, Object>();
            fileMap.put('documentId', link.ContentDocumentId);
            fileMap.put('title', link.ContentDocument.Title);
            fileMap.put('createdDate', link.ContentDocument.CreatedDate);
            fileMap.put('disbursementName', disbName);

            result.add(fileMap);
        }

        return result;
    }
    
    
    /* ================= GET ALL INSTALLMENTS, DISBURSEMENTS & MILESTONES ================= */
    @AuraEnabled
    public static Map<String, Object> getInstallmentsAndDisbursements(Id applicationId) {
        Map<String, Object> result = new Map<String, Object>();

        // 1. Query Disbursements
        List<Disbursement__c> disbursements = [
            SELECT Id, Name, Status__c, Total_Amount__c, Disbursement_Date__c,
                   Payment_Type__c, Installment_Percentage__c, Months__c,
                   Installment__c, Installment__r.Name, Installment__r.Amount__c,
                   Installment__r.Percentage__c, Installment__r.Due_Date__c,
                   Installment__r.Status__c
            FROM Disbursement__c
            WHERE Installment__r.Grant_Applicant__c = :applicationId
               OR Installment__r.Funding_Allocation__r.Grant_Applicant__c = :applicationId
            ORDER BY CreatedDate ASC
        ];

        // 2. Query Installments
        List<Installment__c> installments = [
            SELECT Id, Name, Amount__c, Due_Date__c, Planned_Date__c,
                   Percentage__c, Status__c
            FROM Installment__c
            WHERE Grant_Applicant__c = :applicationId
               OR Funding_Allocation__r.Grant_Applicant__c = :applicationId
            ORDER BY CreatedDate ASC
        ];

        // 3. Query Fund Utilization (Milestones)
        List<Fund_Utilization__c> milestones = [
            SELECT Id, Name, Status__c, Disbursement__c, Disbursement__r.Name,
                   Disbursement__r.Total_Amount__c, Grant_Applicant__c, CreatedDate
            FROM Fund_Utilization__c
            WHERE Grant_Applicant__c = :applicationId
               OR Disbursement__r.Installment__r.Grant_Applicant__c = :applicationId
               OR Disbursement__r.Installment__r.Funding_Allocation__r.Grant_Applicant__c = :applicationId
            ORDER BY CreatedDate DESC
        ];

        // 4. Query files attached to Milestones
        Set<Id> fuIds = new Set<Id>();
        for (Fund_Utilization__c fu : milestones) {
            fuIds.add(fu.Id);
        }

        Map<Id, List<Map<String, Object>>> filesByMilestone = new Map<Id, List<Map<String, Object>>>();
        if (!fuIds.isEmpty()) {
            List<ContentDocumentLink> links = [
                SELECT ContentDocumentId,
                       ContentDocument.Title,
                       ContentDocument.FileExtension,
                       ContentDocument.CreatedDate,
                       LinkedEntityId
                FROM ContentDocumentLink
                WHERE LinkedEntityId IN :fuIds
            ];

            for (ContentDocumentLink link : links) {
                if (!filesByMilestone.containsKey(link.LinkedEntityId)) {
                    filesByMilestone.put(link.LinkedEntityId, new List<Map<String, Object>>());
                }
                Map<String, Object> f = new Map<String, Object>();
                f.put('documentId', link.ContentDocumentId);
                f.put('title', link.ContentDocument.Title);
                f.put('extension', link.ContentDocument.FileExtension);
                f.put('createdDate', link.ContentDocument.CreatedDate);
                filesByMilestone.get(link.LinkedEntityId).add(f);
            }
        }

        // 5. Structure milestones output
        List<Map<String, Object>> milestoneList = new List<Map<String, Object>>();
        for (Fund_Utilization__c fu : milestones) {
            Map<String, Object> m = new Map<String, Object>();
            m.put('id', fu.Id);
            m.put('name', fu.Name);
            m.put('status', fu.Status__c != null ? fu.Status__c : 'Pending');
            m.put('disbursementId', fu.Disbursement__c);
            m.put('disbursementName', fu.Disbursement__r != null ? fu.Disbursement__r.Name : '');
            m.put('disbursementAmount', fu.Disbursement__r != null ? fu.Disbursement__r.Total_Amount__c : 0);
            m.put('createdDate', fu.CreatedDate);
            m.put('files', filesByMilestone.containsKey(fu.Id) ? filesByMilestone.get(fu.Id) : new List<Map<String, Object>>());
            milestoneList.add(m);
        }

        result.put('disbursements', disbursements);
        result.put('installments', installments);
        result.put('milestones', milestoneList);
        result.put('hasData', !disbursements.isEmpty() || !installments.isEmpty());

        return result;
    }

    /* ================= UPLOAD UTILIZATION CERTIFICATE ================= */
    @AuraEnabled
    public static Map<String, Object> uploadUtilizationCertificate(
        Id applicationId,
        Id disbursementId,
        String fileName,
        String base64Data,
        String description
    ) {
        // 1. Create Milestone (Fund_Utilization__c) record
        Fund_Utilization__c fu = new Fund_Utilization__c();
        fu.Grant_Applicant__c = applicationId;
        fu.Disbursement__c = disbursementId;
        fu.Submitted_By__c = applicationId;
        fu.Status__c = 'Pending';
        insert fu;

        Id docId = null;

        // 2. Upload file and link to Milestone
        if (String.isNotBlank(base64Data) && String.isNotBlank(fileName)) {
            ContentVersion cv = new ContentVersion();
            cv.Title = fileName;
            cv.PathOnClient = fileName;
            cv.VersionData = EncodingUtil.base64Decode(base64Data);
            cv.Description = String.isNotBlank(description) ? description : 'Fund Utilization Certificate';
            insert cv;

            docId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;

            ContentDocumentLink link = new ContentDocumentLink();
            link.ContentDocumentId = docId;
            link.LinkedEntityId = fu.Id;
            link.ShareType = 'V';
            link.Visibility = 'AllUsers';
            insert link;
        }

        Fund_Utilization__c created = [
            SELECT Id, Name, Status__c, Disbursement__c, Disbursement__r.Name, CreatedDate
            FROM Fund_Utilization__c
            WHERE Id = :fu.Id
        ];

        Map<String, Object> res = new Map<String, Object>();
        res.put('id', created.Id);
        res.put('name', created.Name);
        res.put('status', created.Status__c);
        res.put('disbursementId', created.Disbursement__c);
        res.put('disbursementName', created.Disbursement__r != null ? created.Disbursement__r.Name : '');
        res.put('createdDate', created.CreatedDate);
        res.put('documentId', docId);

        return res;
    }

    @AuraEnabled
    public static Id createFundUtilization(
        Id applicationId,
        Id disbursementId,
        List<Id> fileIds
    ) {
        // 1. Create Fund Utilization Record with Status Pending
        Fund_Utilization__c fu = new Fund_Utilization__c();
        fu.Grant_Applicant__c = applicationId;
        fu.Disbursement__c = disbursementId;
        fu.Submitted_By__c = applicationId;
        fu.Status__c = 'Pending';

        insert fu;

        // 2. Link Files
        if (fileIds != null && !fileIds.isEmpty()) {
            List<ContentDocumentLink> links = new List<ContentDocumentLink>();
            for (Id fileId : fileIds) {
                links.add(new ContentDocumentLink(
                    ContentDocumentId = fileId,
                    LinkedEntityId = fu.Id,
                    ShareType = 'V',
                    Visibility = 'AllUsers'
                ));
            }
            insert links;
        }

        return fu.Id;
    }
}