public with sharing class StripePaymentService {

    // =============================================================
    // STRIPE ENDPOINTS
    // =============================================================

    // Platform → Connected Account
    private static final String TRANSFER_ENDPOINT =
        'callout:Stripe_API/v1/transfers';

    // Connected Account → Applicant Bank
    private static final String PAYOUT_ENDPOINT =
        'callout:Stripe_API/v1/payouts';

    private static final String CURRENCY_CODE = 'usd';


    // =============================================================
    // MAIN PROCESS
    // =============================================================

    public static void processDisbursement(Id disbursementId) {

        System.debug(
            LoggingLevel.ERROR,
            '===== GEMS STRIPE PROCESS START ====='
        );

        System.debug(
            LoggingLevel.ERROR,
            'Disbursement Id: ' + disbursementId
        );


        // ---------------------------------------------------------
        // Get Disbursement
        // ---------------------------------------------------------

        Disbursement__c disbursement = [
            SELECT
                Id,
                Name,
                Status__c,
                Total_Amount__c,
                Installment__c,
                Installment__r.Grant_Applicant__c,

                // NEW:
                // Grant Applicant → Grant Program/Profile
                // → Stripe Connected Account
                Installment__r.Grant_Applicant__r.Grant_Program__c,
                Installment__r.Grant_Applicant__r.Grant_Program__r.Stripe_Connected_Account_ID__c,

                Payment_Status__c,
                Payment_Initiated_Date__c,
                Payment_Date__c,
                Payment_Error__c,
                Stripe_Payment_ID__c,
                Program_Fund_Deducted__c

            FROM Disbursement__c
            WHERE Id = :disbursementId
            LIMIT 1
        ];


        System.debug(
            LoggingLevel.ERROR,
            'Disbursement Name: ' + disbursement.Name
        );

        System.debug(
            LoggingLevel.ERROR,
            'Disbursement Status: ' + disbursement.Status__c
        );

        System.debug(
            LoggingLevel.ERROR,
            'Disbursement Amount: ' + disbursement.Total_Amount__c
        );


        // ---------------------------------------------------------
        // 1. Verify Disbursement is Approved
        // ---------------------------------------------------------

        if (disbursement.Status__c != 'Approved') {

            throw new StripePaymentException(
                'Disbursement ' + disbursement.Name +
                ' is not Approved.'
            );
        }


        // ---------------------------------------------------------
        // 2. Prevent duplicate processing
        // ---------------------------------------------------------

        if (!String.isBlank(disbursement.Stripe_Payment_ID__c)) {

            throw new StripePaymentException(
                'Stripe payout already exists for ' +
                disbursement.Name
            );
        }


        // ---------------------------------------------------------
        // 3. Validate amount
        // ---------------------------------------------------------

        if (
            disbursement.Total_Amount__c == null ||
            disbursement.Total_Amount__c <= 0
        ) {

            throw new StripePaymentException(
                'Total Amount must be greater than zero.'
            );
        }


        // ---------------------------------------------------------
        // 4. Get Stripe Connected Account
        //
        // Grant Applicant
        //      ↓
        // Grant Program / Profile
        //      ↓
        // Stripe Connected Account
        // ---------------------------------------------------------

        String stripeAccountId =
            disbursement.Installment__r
                .Grant_Applicant__r
                .Grant_Program__r
                .Stripe_Connected_Account_ID__c;


        System.debug(
            LoggingLevel.ERROR,
            'Stripe Connected Account: ' +
            stripeAccountId
        );


        if (String.isBlank(stripeAccountId)) {

            throw new StripePaymentException(
                'Stripe Connected Account ID is missing for ' +
                'the Grant Program/Profile associated with ' +
                'the Grant Applicant.'
            );
        }


        // ---------------------------------------------------------
        // 5. Convert dollars to cents
        //
        // Example:
        // $250 = 25000 cents
        // ---------------------------------------------------------

        Integer amountInSmallestUnit =
            Integer.valueOf(
                (disbursement.Total_Amount__c * 100)
                    .setScale(0)
            );


        System.debug(
            LoggingLevel.ERROR,
            'Amount in smallest currency unit: ' +
            amountInSmallestUnit
        );


        // =========================================================
        // 6. CREATE TRANSFER
        //
        // Platform
        //    ↓
        // Connected Account
        // =========================================================

        String transferId;

        try {

            transferId = createTransfer(
                disbursement,
                stripeAccountId,
                amountInSmallestUnit
            );

        } catch (Exception ex) {

            System.debug(
                LoggingLevel.ERROR,
                '===== GEMS STRIPE TRANSFER FAILED ====='
            );

            System.debug(
                LoggingLevel.ERROR,
                'Transfer Error: ' +
                ex.getMessage()
            );


            updateFailure(
                disbursement.Id,
                'Stripe transfer failed: ' +
                ex.getMessage()
            );


            throw new StripePaymentException(
                'Stripe transfer failed: ' +
                ex.getMessage()
            );
        }


        System.debug(
            LoggingLevel.ERROR,
            'Transfer ID returned: ' +
            transferId
        );


        // =========================================================
        // 7. CREATE PAYOUT
        //
        // Connected Account
        //    ↓
        // Applicant Bank
        // =========================================================

        try {

            String payoutId = createPayout(
                disbursement,
                stripeAccountId,
                amountInSmallestUnit
            );


            System.debug(
                LoggingLevel.ERROR,
                'Payout ID returned: ' +
                payoutId
            );


            // -----------------------------------------------------
            // 8. Save successful payment
            // -----------------------------------------------------

            update new Disbursement__c(
                Id = disbursement.Id,

                Stripe_Payment_ID__c =
                    payoutId,

                Payment_Initiated_Date__c =
                    System.now(),

                Payment_Date__c =
                    System.now(),

                Payment_Error__c =
                    null,

                Payment_Status__c =
                    'Paid'
            );


            // -----------------------------------------------------
            // Deduct Program Fund
            // -----------------------------------------------------

            deductProgramFund(
                disbursement.Id
            );


            // -----------------------------------------------------
            // Deduct Donor Agreement Funds
            // -----------------------------------------------------

            deductDonorAgreementFunds(
                disbursement.Id
            );


            System.debug(
                LoggingLevel.ERROR,
                '===== GEMS STRIPE PAYMENT COMPLETED ====='
            );

            System.debug(
                LoggingLevel.ERROR,
                'Disbursement: ' +
                disbursement.Name
            );

            System.debug(
                LoggingLevel.ERROR,
                'Transfer ID: ' +
                transferId
            );

            System.debug(
                LoggingLevel.ERROR,
                'Payout ID: ' +
                payoutId
            );


        } catch (Exception ex) {

            System.debug(
                LoggingLevel.ERROR,
                '===== GEMS STRIPE PAYOUT FAILED ====='
            );

            System.debug(
                LoggingLevel.ERROR,
                'Transfer already created: ' +
                transferId
            );

            System.debug(
                LoggingLevel.ERROR,
                'Payout Error: ' +
                ex.getMessage()
            );


            updateFailure(
                disbursement.Id,
                'Stripe transfer succeeded but payout failed. ' +
                'Transfer ID: ' +
                transferId +
                '. Error: ' +
                ex.getMessage()
            );


            throw new StripePaymentException(
                'Transfer succeeded but payout failed: ' +
                ex.getMessage()
            );
        }
    }


    // =============================================================
    // CREATE TRANSFER
    // Platform → Connected Account
    // =============================================================

    private static String createTransfer(
        Disbursement__c disbursement,
        String stripeAccountId,
        Integer amountInSmallestUnit
    ) {

        HttpRequest request =
            new HttpRequest();


        request.setEndpoint(
            TRANSFER_ENDPOINT
        );

        request.setMethod(
            'POST'
        );


        request.setHeader(
            'Content-Type',
            'application/x-www-form-urlencoded'
        );


        request.setHeader(
            'Idempotency-Key',
            'gems-transfer-' +
            disbursement.Id
        );


        String body =
            'amount=' +
            EncodingUtil.urlEncode(
                String.valueOf(
                    amountInSmallestUnit
                ),
                'UTF-8'
            )

            +

            '&currency=' +
            EncodingUtil.urlEncode(
                CURRENCY_CODE,
                'UTF-8'
            )

            +

            '&destination=' +
            EncodingUtil.urlEncode(
                stripeAccountId,
                'UTF-8'
            )

            +

            '&description=' +
            EncodingUtil.urlEncode(
                'GEMS Disbursement ' +
                disbursement.Name,
                'UTF-8'
            );


        request.setBody(
            body
        );


        System.debug(
            LoggingLevel.ERROR,
            '===== STRIPE TRANSFER REQUEST ====='
        );

        System.debug(
            LoggingLevel.ERROR,
            'Endpoint: ' +
            request.getEndpoint()
        );

        System.debug(
            LoggingLevel.ERROR,
            'Method: ' +
            request.getMethod()
        );

        System.debug(
            LoggingLevel.ERROR,
            'Connected Account: ' +
            stripeAccountId
        );

        System.debug(
            LoggingLevel.ERROR,
            'Amount: ' +
            amountInSmallestUnit
        );

        System.debug(
            LoggingLevel.ERROR,
            'Currency: ' +
            CURRENCY_CODE
        );

        System.debug(
            LoggingLevel.ERROR,
            'Request Body: ' +
            request.getBody()
        );


        Http http =
            new Http();

        HttpResponse response;


        try {

            response =
                http.send(
                    request
                );

        } catch (Exception ex) {

            System.debug(
                LoggingLevel.ERROR,
                '===== STRIPE TRANSFER CALLOUT EXCEPTION ====='
            );

            System.debug(
                LoggingLevel.ERROR,
                ex.getMessage()
            );


            throw new StripePaymentException(
                'Transfer callout failed: ' +
                ex.getMessage()
            );
        }


        System.debug(
            LoggingLevel.ERROR,
            '===== STRIPE TRANSFER RESPONSE ====='
        );

        System.debug(
            LoggingLevel.ERROR,
            'HTTP Status: ' +
            response.getStatusCode()
        );

        System.debug(
            LoggingLevel.ERROR,
            'Response Body: ' +
            response.getBody()
        );


        if (
            response.getStatusCode() >= 200 &&
            response.getStatusCode() < 300
        ) {

            Map<String, Object> responseMap =
                (Map<String, Object>)
                    JSON.deserializeUntyped(
                        response.getBody()
                    );


            String transferId =
                (String)
                    responseMap.get(
                        'id'
                    );


            if (String.isBlank(
                transferId
            )) {

                throw new StripePaymentException(
                    'Stripe transfer succeeded but no ' +
                    'Transfer ID was returned.'
                );
            }


            System.debug(
                LoggingLevel.ERROR,
                'Stripe Transfer created: ' +
                transferId
            );


            return transferId;
        }


        String errorMessage =
            extractStripeError(
                response.getBody()
            );


        System.debug(
            LoggingLevel.ERROR,
            'Stripe Transfer Error: ' +
            errorMessage
        );


        throw new StripePaymentException(
            'Stripe transfer failed: ' +
            errorMessage
        );
    }


    // =============================================================
    // CREATE PAYOUT
    // Connected Account → Bank
    // =============================================================

    private static String createPayout(
        Disbursement__c disbursement,
        String stripeAccountId,
        Integer amountInSmallestUnit
    ) {

        HttpRequest request =
            new HttpRequest();


        request.setEndpoint(
            PAYOUT_ENDPOINT
        );

        request.setMethod(
            'POST'
        );


        request.setHeader(
            'Content-Type',
            'application/x-www-form-urlencoded'
        );


        request.setHeader(
            'Stripe-Account',
            stripeAccountId
        );


        request.setHeader(
            'Idempotency-Key',
            'gems-payout-' +
            disbursement.Id
        );


        String body =
            'amount=' +
            EncodingUtil.urlEncode(
                String.valueOf(
                    amountInSmallestUnit
                ),
                'UTF-8'
            )

            +

            '&currency=' +
            EncodingUtil.urlEncode(
                CURRENCY_CODE,
                'UTF-8'
            )

            +

            '&description=' +
            EncodingUtil.urlEncode(
                'GEMS Disbursement ' +
                disbursement.Name,
                'UTF-8'
            );


        request.setBody(
            body
        );


        System.debug(
            LoggingLevel.ERROR,
            '===== STRIPE PAYOUT REQUEST ====='
        );

        System.debug(
            LoggingLevel.ERROR,
            'Endpoint: ' +
            request.getEndpoint()
        );

        System.debug(
            LoggingLevel.ERROR,
            'Method: ' +
            request.getMethod()
        );

        System.debug(
            LoggingLevel.ERROR,
            'Connected Account: ' +
            stripeAccountId
        );

        System.debug(
            LoggingLevel.ERROR,
            'Amount: ' +
            amountInSmallestUnit
        );

        System.debug(
            LoggingLevel.ERROR,
            'Currency: ' +
            CURRENCY_CODE
        );

        System.debug(
            LoggingLevel.ERROR,
            'Request Body: ' +
            request.getBody()
        );


        Http http =
            new Http();

        HttpResponse response;


        try {

            response =
                http.send(
                    request
                );

        } catch (Exception ex) {

            System.debug(
                LoggingLevel.ERROR,
                '===== STRIPE PAYOUT CALLOUT EXCEPTION ====='
            );

            System.debug(
                LoggingLevel.ERROR,
                ex.getMessage()
            );


            throw new StripePaymentException(
                'Payout callout failed: ' +
                ex.getMessage()
            );
        }


        System.debug(
            LoggingLevel.ERROR,
            '===== STRIPE PAYOUT RESPONSE ====='
        );

        System.debug(
            LoggingLevel.ERROR,
            'HTTP Status: ' +
            response.getStatusCode()
        );

        System.debug(
            LoggingLevel.ERROR,
            'Response Body: ' +
            response.getBody()
        );


        if (
            response.getStatusCode() >= 200 &&
            response.getStatusCode() < 300
        ) {

            Map<String, Object> responseMap =
                (Map<String, Object>)
                    JSON.deserializeUntyped(
                        response.getBody()
                    );


            String payoutId =
                (String)
                    responseMap.get(
                        'id'
                    );


            if (String.isBlank(
                payoutId
            )) {

                throw new StripePaymentException(
                    'Stripe payout succeeded but no ' +
                    'Payout ID was returned.'
                );
            }


            String stripeStatus =
                (String)
                    responseMap.get(
                        'status'
                    );


            System.debug(
                LoggingLevel.ERROR,
                'Stripe Payout created: ' +
                payoutId
            );

            System.debug(
                LoggingLevel.ERROR,
                'Stripe Payout Status: ' +
                stripeStatus
            );


            return payoutId;
        }


        String errorMessage =
            extractStripeError(
                response.getBody()
            );


        System.debug(
            LoggingLevel.ERROR,
            'Stripe Payout Error: ' +
            errorMessage
        );


        throw new StripePaymentException(
            'Stripe payout failed: ' +
            errorMessage
        );
    }


    // =============================================================
    // FAILURE HANDLING
    // =============================================================

    private static void updateFailure(
        Id disbursementId,
        String errorMessage
    ) {

        System.debug(
            LoggingLevel.ERROR,
            '===== GEMS PAYMENT FAILURE ====='
        );

        System.debug(
            LoggingLevel.ERROR,
            'Disbursement Id: ' +
            disbursementId
        );

        System.debug(
            LoggingLevel.ERROR,
            'Error: ' +
            errorMessage
        );


        update new Disbursement__c(
            Id = disbursementId,
            Payment_Status__c = 'Failed',
            Payment_Error__c = errorMessage
        );
    }


    // =============================================================
    // DEDUCT PROGRAM FUND
    // =============================================================

    private static void deductProgramFund(
        Id disbursementId
    ) {

        Disbursement__c disbursement = [
            SELECT
                Id,
                Name,
                Total_Amount__c,
                Payment_Status__c,
                Program_Fund_Deducted__c,
                Installment__c,
                Installment__r.Grant_Applicant__c,
                Installment__r.Grant_Applicant__r.Program__c
            FROM Disbursement__c
            WHERE Id = :disbursementId
            LIMIT 1
            FOR UPDATE
        ];


        if (disbursement.Payment_Status__c != 'Paid') {
            return;
        }


        if (disbursement.Program_Fund_Deducted__c == true) {
            return;
        }


        if (
            disbursement.Total_Amount__c == null ||
            disbursement.Total_Amount__c <= 0
        ) {

            throw new StripePaymentException(
                'Disbursement amount must be greater than zero.'
            );
        }


        if (
            disbursement.Installment__r == null ||
            disbursement.Installment__r.Grant_Applicant__r == null ||
            disbursement.Installment__r
                .Grant_Applicant__r
                .Program__c == null
        ) {

            throw new StripePaymentException(
                'Grant Program could not be found for ' +
                disbursement.Name
            );
        }


        Id programId =
            disbursement
                .Installment__r
                .Grant_Applicant__r
                .Program__c;


        Program__c program = [
            SELECT
                Id,
                Name,
                Program_Fund__c
            FROM Program__c
            WHERE Id = :programId
            LIMIT 1
            FOR UPDATE
        ];


        Decimal currentFund =
            program.Program_Fund__c == null
                ? 0
                : program.Program_Fund__c;


        Decimal paymentAmount =
            disbursement.Total_Amount__c;


        program.Program_Fund__c =
            currentFund - paymentAmount;


        update program;


        update new Disbursement__c(
            Id = disbursement.Id,
            Program_Fund_Deducted__c = true
        );


        System.debug(
            LoggingLevel.ERROR,
            'Program Fund deducted: ' +
            paymentAmount +
            '. Remaining Fund: ' +
            program.Program_Fund__c
        );
    }


    // =============================================================
    // DEDUCT DONOR AGREEMENT FUNDS
    // =============================================================

    private static void deductDonorAgreementFunds(
        Id disbursementId
    ) {

        // =========================================================
        // Get Disbursement + Grant Applicant
        // =========================================================

        Disbursement__c disbursement = [
            SELECT
                Id,
                Name,
                Total_Amount__c,
                Payment_Status__c,
                Donor_Agreement_Fund_Deducted__c,
                Installment__c,
                Installment__r.Grant_Applicant__c
            FROM Disbursement__c
            WHERE Id = :disbursementId
            LIMIT 1
            FOR UPDATE
        ];


        // =========================================================
        // Only process Paid disbursements
        // =========================================================

        if (disbursement.Payment_Status__c != 'Paid') {
            return;
        }


        // =========================================================
        // Prevent duplicate deduction
        // =========================================================

        if (
            disbursement.Donor_Agreement_Fund_Deducted__c == true
        ) {
            return;
        }


        // =========================================================
        // Validate amount
        // =========================================================

        if (
            disbursement.Total_Amount__c == null ||
            disbursement.Total_Amount__c <= 0
        ) {

            throw new StripePaymentException(
                'Disbursement amount must be greater than zero.'
            );
        }


        // =========================================================
        // Get Grant Applicant
        // =========================================================

        Id grantApplicantId =
            disbursement
                .Installment__r
                .Grant_Applicant__c;


        if (grantApplicantId == null) {

            throw new StripePaymentException(
                'Grant Applicant could not be found for ' +
                disbursement.Name
            );
        }


        // =========================================================
        // Get Funding Requests
        //
        // Each Funding Request represents one
        // Donor Agreement allocation.
        // =========================================================

        List<Funding_Request__c> fundingRequests = [
            SELECT
                Id,
                Donor_Agreement__c,
                Requested_Amount_FR__c
            FROM Funding_Request__c
            WHERE Grant_Applicant__c = :grantApplicantId
            AND Donor_Agreement__c != null
            AND Requested_Amount_FR__c > 0
        ];


        if (fundingRequests.isEmpty()) {

            throw new StripePaymentException(
                'No Donor Agreement Funding Requests were found for ' +
                'Grant Applicant.'
            );
        }


        // =========================================================
        // Calculate total allocation
        // =========================================================

        Decimal totalAllocation = 0;

        Map<Id, Decimal> agreementAllocationMap =
            new Map<Id, Decimal>();


        for (
            Funding_Request__c fundingRequest :
            fundingRequests
        ) {

            Decimal allocation =
                fundingRequest.Requested_Amount_FR__c;

            totalAllocation += allocation;


            if (
                agreementAllocationMap.containsKey(
                    fundingRequest.Donor_Agreement__c
                )
            ) {

                agreementAllocationMap.put(
                    fundingRequest.Donor_Agreement__c,
                    agreementAllocationMap.get(
                        fundingRequest.Donor_Agreement__c
                    ) + allocation
                );

            } else {

                agreementAllocationMap.put(
                    fundingRequest.Donor_Agreement__c,
                    allocation
                );
            }
        }


        if (totalAllocation <= 0) {

            throw new StripePaymentException(
                'Total Donor Agreement allocation must be greater than zero.'
            );
        }


        // =========================================================
        // Lock Donor Agreements
        // =========================================================

        List<Donor_Agreement__c> agreements = [
            SELECT
                Id,
                Name,
                Agreement_Amount__c,
                Total_Disbursed__c
            FROM Donor_Agreement__c
            WHERE Id IN :agreementAllocationMap.keySet()
            FOR UPDATE
        ];


        List<Donor_Agreement__c> agreementsToUpdate =
            new List<Donor_Agreement__c>();


        // =========================================================
        // Distribute Disbursement Amount
        // =========================================================

        Decimal paymentAmount =
            disbursement.Total_Amount__c;


        Decimal amountDistributed = 0;

        Integer agreementIndex = 0;


        for (
            Donor_Agreement__c agreement :
            agreements
        ) {

            Decimal allocation =
                agreementAllocationMap.get(
                    agreement.Id
                );


            Decimal agreementPayment =
                paymentAmount *
                allocation /
                totalAllocation;


            // Handle rounding on final agreement
            if (
                agreementIndex ==
                agreements.size() - 1
            ) {

                agreementPayment =
                    paymentAmount -
                    amountDistributed;
            }


            Decimal currentDisbursed =
                agreement.Total_Disbursed__c == null
                    ? 0
                    : agreement.Total_Disbursed__c;


            agreement.Total_Disbursed__c =
                currentDisbursed +
                agreementPayment;


            agreementsToUpdate.add(
                agreement
            );


            amountDistributed +=
                agreementPayment;


            agreementIndex++;


            System.debug(
                LoggingLevel.ERROR,
                'Donor Agreement ' +
                agreement.Name +
                ' allocation: ' +
                allocation +
                ' / ' +
                totalAllocation +
                ' = payment ' +
                agreementPayment
            );
        }


        // =========================================================
        // Update Donor Agreements
        // =========================================================

        if (!agreementsToUpdate.isEmpty()) {

            update agreementsToUpdate;
        }


        // =========================================================
        // Mark Disbursement as processed
        // =========================================================

        update new Disbursement__c(
            Id = disbursement.Id,
            Donor_Agreement_Fund_Deducted__c = true
        );


        System.debug(
            LoggingLevel.ERROR,
            '===== DONOR AGREEMENT FUNDS DEDUCTED ====='
        );

        System.debug(
            LoggingLevel.ERROR,
            'Disbursement: ' +
            disbursement.Name
        );

        System.debug(
            LoggingLevel.ERROR,
            'Payment Amount: ' +
            paymentAmount
        );

        System.debug(
            LoggingLevel.ERROR,
            'Total Allocation: ' +
            totalAllocation
        );
    }


    // =============================================================
    // STRIPE ERROR EXTRACTION
    // =============================================================

    private static String extractStripeError(
        String responseBody
    ) {

        try {

            Map<String, Object> responseMap =
                (Map<String, Object>)
                    JSON.deserializeUntyped(
                        responseBody
                    );


            if (
                responseMap.containsKey(
                    'error'
                )
            ) {

                Map<String, Object> errorMap =
                    (Map<String, Object>)
                        responseMap.get(
                            'error'
                        );


                if (
                    errorMap.containsKey(
                        'message'
                    )
                ) {

                    return String.valueOf(
                        errorMap.get(
                            'message'
                        )
                    );
                }
            }

        } catch (Exception ex) {

            System.debug(
                LoggingLevel.ERROR,
                'Could not parse Stripe error: ' +
                ex.getMessage()
            );
        }


        return responseBody;
    }


    // =============================================================
    // CUSTOM EXCEPTION
    // =============================================================

    public class StripePaymentException
        extends Exception {
    }
}