public without sharing class GrantAppPDFSaver {
    
    public Id recordId { get; set; }
    
    public GrantAppPDFSaver(ApexPages.StandardController controller) {
        this.recordId = controller.getId();
    }
    
    public PageReference savePDF() {
        if (recordId != null) {
            try {
                // Generate and attach PDF with Visibility = 'AllUsers'
                GrantApplicationController1.generateApplicantPdf(recordId);
            } catch (Exception e) {
                System.debug('Error in GrantAppPDFSaver.savePDF: ' + e.getMessage() + '\n' + e.getStackTraceString());
            }
        }
        
        PageReference returnPage = new PageReference('/' + recordId);
        returnPage.setRedirect(true);
        return returnPage;
    }
}