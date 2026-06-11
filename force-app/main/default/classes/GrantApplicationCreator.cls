public with sharing class GrantApplicationCreator {

    
    public class InputWrapper {
        @InvocableVariable(required=true)
        public Id accountId;

        @InvocableVariable
        public Id profileId;

        @InvocableVariable
        public Id reviewerId;

        @InvocableVariable(required=true)
        public String organizationType;
        
        @InvocableVariable(required=true)
        public String Program;

        @InvocableVariable(required=true)
        public String programCategory;

        @InvocableVariable
        public String applicantName;

        @InvocableVariable
        public String programName;

        @InvocableVariable(required=true)
        public Decimal requestedAmount;

        @InvocableVariable(required=true)
        public Date submissionDate;

        @InvocableVariable
        public String projectTitle;

        @InvocableVariable
        public String projectDescription;

        @InvocableVariable
        public String budgetDetails;

        @InvocableVariable
        public Date startDate;

        @InvocableVariable
        public String bankAccountNumber;

        @InvocableVariable
        public String bankName;

        @InvocableVariable
        public String ifscSwiftCode;
        
        @InvocableVariable
        public String TaxId;
    }

         
   
    public class OutputWrapper {
        @InvocableVariable
        public Id grantApplicantId;

        @InvocableVariable
        public String finalStatus;

        @InvocableVariable
        public String rejectionReason;
    }

    @InvocableMethod(
        label='Create Grant Application'
        description='Creates Grant Application with eligibility, amount validation, and auto end date'
    )
    public static List<OutputWrapper> createGrantApplication(List<InputWrapper> inputs) {

        System.debug('=== START GrantApplicationCreator ===');
        System.debug('INPUT SIZE: ' + inputs.size());

        
        Map<String, Set<String>> eligibilityMap = new Map<String, Set<String>>{
            'Academic Institution' => new Set<String>{ 'Education Program', 'Research Program' },
            'NGO' => new Set<String>{ 'Healthcare Program', 'Social Welfare Program' },
            'Private Organization' => new Set<String>{ 'Community Development', 'Capacity Building' },
            'Individual Applicant' => new Set<String>{ 'Livelihood Support', 'Emergency Assistance' }
        };

        
        Map<String, Decimal> programMaxAmountMap = new Map<String, Decimal>{
            'Education Program'        => 100000,
            'Research Program'         => 250000,
            'Healthcare Program'       => 150000,
            'Social Welfare Program'   => 120000,
            'Community Development'    => 200000,
            'Capacity Building'        => 180000,
            'Livelihood Support'       => 50000,
            'Emergency Assistance'     => 50000
        };

        List<Grant_Applicant__c> records = new List<Grant_Applicant__c>();
        List<OutputWrapper> outputs = new List<OutputWrapper>();

        Integer row = 0;

        for (InputWrapper inRec : inputs) {
            row++;
            System.debug('--- Processing row #' + row + ' ---');
            System.debug('Raw Input: ' + JSON.serializePretty(inRec));

            String status = 'Submitted';
            String rejectionReason;

            // ---- Eligibility Check ----
            if (
                !eligibilityMap.containsKey(inRec.organizationType) ||
                !eligibilityMap.get(inRec.organizationType).contains(inRec.programName)
            ) {
                status = 'Rejected';
                rejectionReason = 'Organization is not eligible for selected program';
            }

            System.debug('Eligibility Status: ' + status);

            // ---- Amount Check ----
            if (
                status == 'Submitted' &&
                programMaxAmountMap.containsKey(inRec.programName) &&
                inRec.requestedAmount > programMaxAmountMap.get(inRec.programName)
            ) {
                status = 'Rejected';
                rejectionReason = 'Requested amount exceeds maximum allowed';
            }

            System.debug('Final Status after Amount Check: ' + status);

            // ---- Auto End Date ----
            Date calculatedEndDate = inRec.startDate != null
                ? inRec.startDate.addMonths(1)
                : null;

            System.debug('Start Date: ' + inRec.startDate);
            System.debug('Calculated End Date: ' + calculatedEndDate);

            Grant_Applicant__c ga = new Grant_Applicant__c(
                Account__c                = inRec.accountId,
                Grant_Program__c          = inRec.profileId,
                Requested_Amount__c       = inRec.requestedAmount,
                Application_Status__c     = status,
                Submission_Date__c        = inRec.submissionDate,
                Project_Title__c          = inRec.projectTitle,
                Project_Description__c    = inRec.projectDescription,
                Budget_Details__c         = inRec.budgetDetails,
                Start_Date__c             = inRec.startDate,
                End_Date__c               = calculatedEndDate,
                Bank_Account_Number_applicant__c = inRec.bankAccountNumber,
                Bank_Name_applicant__c    = inRec.bankName,
                IFSC_SWIFT_Code_applicant__c = inRec.ifscSwiftCode,
                Applicant_Name__c         = inRec.applicantName,
                Reviewer_Assigned__c      = inRec.reviewerId,
                Program__c = inRec.Program,
                Tax_ID_applicant__c = inRec.TaxId
            );

            System.debug('Grant_Applicant__c to insert: ' + ga);

            records.add(ga);

            OutputWrapper out = new OutputWrapper();
            out.finalStatus = status;
            out.rejectionReason = rejectionReason;
            outputs.add(out);
        }

        System.debug('Attempting to insert ' + records.size() + ' Grant Applicant records');

        try {
            insert records;
            System.debug('Insert SUCCESS');
        } catch (DmlException e) {
            System.debug('🔥 DML ERROR OCCURRED 🔥');
            System.debug('Message: ' + e.getMessage());
            System.debug('StackTrace: ' + e.getStackTraceString());
            throw e; // Let Flow catch it so email is sent
        }

        for (Integer i = 0; i < records.size(); i++) {
            outputs[i].grantApplicantId = records[i].Id;
        }

        System.debug('=== END GrantApplicationCreator ===');
        return outputs;
    }
}