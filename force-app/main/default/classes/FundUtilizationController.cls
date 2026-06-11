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
    
    
    @AuraEnabled
public static Id createFundUtilization(
    Id applicationId,
    Id disbursementId,
    List<Id> fileIds
) {
    // 1. Create Fund Utilization Record
    Fund_Utilization__c fu = new Fund_Utilization__c();
    fu.Grant_Applicant__c = applicationId;
    fu.Disbursement__c = disbursementId;

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