public with sharing class StripeConnectController {

    @AuraEnabled
    public static String connectStripe(
        Id grantApplicantId
    ) {

        if (grantApplicantId == null) {

            throw new AuraHandledException(
                'Grant Applicant Id is required.'
            );
        }


        try {

            /*
             * Create account if necessary.
             */
            String stripeAccountId =
                StripeConnectService.createConnectedAccount(
                    grantApplicantId
                );


            /*
             * Generate onboarding URL.
             */
            String onboardingUrl =
                StripeConnectService.createOnboardingLink(
                    grantApplicantId
                );


            return onboardingUrl;

        } catch (Exception ex) {

            throw new AuraHandledException(
                ex.getMessage()
            );
        }
    }
}