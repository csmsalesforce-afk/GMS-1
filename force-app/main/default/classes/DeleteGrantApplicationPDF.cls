public with sharing class DeleteGrantApplicationPDF {

    @InvocableMethod(
        label='Delete Grant Application PDF'
        description='Deletes the latest Grant Application PDF when application is rejected'
    )
    public static void deletePDF(List<Id> applicationIds) {

        if (applicationIds == null || applicationIds.isEmpty()) {
            return;
        }

        // 1. Get ContentDocumentLinks for the Grant Applications
        List<ContentDocumentLink> links = [
            SELECT ContentDocumentId
            FROM ContentDocumentLink
            WHERE LinkedEntityId IN :applicationIds
        ];

        if (links.isEmpty()) {
            return;
        }

        Set<Id> contentDocIds = new Set<Id>();
        for (ContentDocumentLink cdl : links) {
            contentDocIds.add(cdl.ContentDocumentId);
        }

        // 2. Get latest ContentVersion linked to these documents (IsLatest only)
        List<ContentVersion> versions = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion
            WHERE ContentDocumentId IN :contentDocIds
            AND IsLatest = true
            WITH USER_MODE
        ];

        if (versions.isEmpty()) {
            return;
        }

        // 3. Collect ContentDocument Ids
        Set<Id> docIds = new Set<Id>();
        for (ContentVersion cv : versions) {
            docIds.add(cv.ContentDocumentId);
        }
        // 4. Delete ContentDocuments (deletes the file completely)
        delete [
            SELECT Id
            FROM ContentDocument
            WHERE Id IN :docIds
        ];
    }
}