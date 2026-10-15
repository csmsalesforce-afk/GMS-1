public with sharing class StripeConnectService {

    /*
     * =========================================================
     * STRIPE ENDPOINTS
     * =========================================================
     */

    private static final String ACCOUNTS_ENDPOINT =
        'callout:Stripe_API/v2/core/accounts';

    private static final String ACCOUNT_LINK_ENDPOINT =
        'callout:Stripe_API/v2/core/account_links';

    private static final String STRIPE_API_VERSION =
        '2026-08-26.dahlia';


    /*
     * =========================================================
     * CREATE CONNECTED ACCOUNT
     * =========================================================
     *
     * One Profile (Grant_Program__c) = One Stripe Account.
     *
     * The Stripe account is stored on:
     *
     * Stripe_Connected_Account_ID__c
     *
     * Multiple Grant Applicants can therefore use the same
     * Stripe Connected Account through their Profile.
     * =========================================================
     */

    private static String createConnectedAccount(
        Id grantProgramId
    ) {

        /*
         * ---------------------------------------------------------
         * Get Profile
         * ---------------------------------------------------------
         */
        Grant_Program__c profile = [
            SELECT
                Id,
                Name,
                Primary_Contact_Name__c,
                Primary_Contact_Email__c,
                Country__c,
                Country__r.Name,
                Stripe_Connected_Account_ID__c,
                Stripe_Onboarding_Status__c
            FROM Grant_Program__c
            WHERE Id = :grantProgramId
            LIMIT 1
        ];


        /*
         * ---------------------------------------------------------
         * Reuse existing Stripe account
         * ---------------------------------------------------------
         *
         * If this Profile already has a Stripe account,
         * don't create another account.
         * ---------------------------------------------------------
         */
        if (
            String.isNotBlank(
                profile.Stripe_Connected_Account_ID__c
            )
        ) {

            System.debug(
                LoggingLevel.ERROR,
                'Existing Stripe account found for Profile: ' +
                profile.Id
            );

            System.debug(
                LoggingLevel.ERROR,
                'Stripe Account ID: ' +
                profile.Stripe_Connected_Account_ID__c
            );

            return profile.Stripe_Connected_Account_ID__c;
        }


        /*
         * ---------------------------------------------------------
         * Validate Primary Contact Email
         * ---------------------------------------------------------
         */
        if (
            String.isBlank(
                profile.Primary_Contact_Email__c
            )
        ) {

            throw new StripeConnectException(
                'Primary Contact Email is required for Stripe onboarding.'
            );
        }


        /*
         * ---------------------------------------------------------
         * Validate Primary Contact Name / Profile Name
         * ---------------------------------------------------------
         */
        String displayName =
            getProfileDisplayName(profile);


        /*
         * ---------------------------------------------------------
         * Validate Country
         * ---------------------------------------------------------
         *
         * Country__c is a Lookup(Country).
         * Therefore we use Country__r.Name.
         * ---------------------------------------------------------
         */
        if (
            profile.Country__c == null ||
            profile.Country__r == null ||
            String.isBlank(
                profile.Country__r.Name
            )
        ) {

            throw new StripeConnectException(
                'Country is required on the Profile before connecting Stripe.'
            );
        }


        /*
         * ---------------------------------------------------------
         * Convert Country to Stripe ISO Code
         * ---------------------------------------------------------
         */
        String stripeCountry =
            convertCountryToStripeCode(
                profile.Country__r.Name
            );


        if (
            String.isBlank(stripeCountry)
        ) {

            throw new StripeConnectException(
                'Profile Country is unsupported: ' +
                profile.Country__r.Name
            );
        }


        /*
         * =========================================================
         * STRIPE IDENTITY
         * =========================================================
         */

        Map<String, Object> identity =
            new Map<String, Object>{

                'country' =>
                    stripeCountry.toLowerCase(),

                'entity_type' =>
                    'individual'
            };


        /*
         * =========================================================
         * RECIPIENT TRANSFER CAPABILITY
         * =========================================================
         */

        Map<String, Object> stripeTransfers =
            new Map<String, Object>{
                'requested' => true
            };


        Map<String, Object> stripeBalance =
            new Map<String, Object>{
                'stripe_transfers' =>
                    stripeTransfers
            };


        Map<String, Object> recipientCapabilities =
            new Map<String, Object>{
                'stripe_balance' =>
                    stripeBalance
            };


        Map<String, Object> recipientConfiguration =
            new Map<String, Object>{
                'capabilities' =>
                    recipientCapabilities
            };


        Map<String, Object> configuration =
            new Map<String, Object>{
                'recipient' =>
                    recipientConfiguration
            };


        /*
         * =========================================================
         * ACCOUNT RESPONSIBILITIES
         * =========================================================
         */

        Map<String, Object> responsibilities =
            new Map<String, Object>{

                'fees_collector' =>
                    'application',

                'losses_collector' =>
                    'application'
            };


        /*
         * =========================================================
         * ACCOUNT DEFAULTS
         * =========================================================
         */

        Map<String, Object> defaults =
            new Map<String, Object>{

                'currency' =>
                    'usd',

                'responsibilities' =>
                    responsibilities
            };


        /*
         * =========================================================
         * STRIPE ACCOUNT REQUEST BODY
         * =========================================================
         */

        Map<String, Object> requestBody =
            new Map<String, Object>{

                'contact_email' =>
                    profile.Primary_Contact_Email__c,

                'display_name' =>
                    displayName,

                'dashboard' =>
                    'express',

                'identity' =>
                    identity,

                'configuration' =>
                    configuration,

                'defaults' =>
                    defaults,

                'include' =>
                    new List<String>{
                        'configuration.recipient',
                        'identity',
                        'requirements'
                    }
            };


        /*
         * =========================================================
         * DEBUG
         * =========================================================
         */

        System.debug(
            LoggingLevel.ERROR,
            '========== STRIPE ACCOUNT CREATION =========='
        );

        System.debug(
            LoggingLevel.ERROR,
            'PROFILE ID: ' +
            profile.Id
        );

        System.debug(
            LoggingLevel.ERROR,
            'PROFILE NAME: ' +
            profile.Name
        );

        System.debug(
            LoggingLevel.ERROR,
            'DISPLAY NAME: ' +
            displayName
        );

        System.debug(
            LoggingLevel.ERROR,
            'STRIPE COUNTRY: ' +
            stripeCountry
        );

        System.debug(
            LoggingLevel.ERROR,
            'CONTACT EMAIL: ' +
            profile.Primary_Contact_Email__c
        );

        System.debug(
            LoggingLevel.ERROR,
            'STRIPE REQUEST BODY: ' +
            JSON.serialize(requestBody)
        );


        /*
         * =========================================================
         * HTTP REQUEST
         * =========================================================
         */

        HttpRequest request =
            new HttpRequest();


        request.setEndpoint(
            ACCOUNTS_ENDPOINT
        );


        request.setMethod(
            'POST'
        );


        request.setHeader(
            'Content-Type',
            'application/json'
        );


        request.setHeader(
            'Stripe-Version',
            STRIPE_API_VERSION
        );


        request.setBody(
            JSON.serialize(requestBody)
        );


        /*
         * =========================================================
         * SEND REQUEST
         * =========================================================
         */

        Http http =
            new Http();


        HttpResponse response;


        try {

            response =
                http.send(request);

        } catch (Exception ex) {

            throw new StripeConnectException(
                'Stripe account creation callout failed: ' +
                ex.getMessage()
            );
        }


        /*
         * =========================================================
         * STRIPE RESPONSE
         * =========================================================
         */

        System.debug(
            LoggingLevel.ERROR,
            'STRIPE ACCOUNT CREATION STATUS: ' +
            response.getStatusCode()
        );


        System.debug(
            LoggingLevel.ERROR,
            'STRIPE ACCOUNT CREATION RESPONSE: ' +
            response.getBody()
        );


        /*
         * =========================================================
         * SUCCESS
         * =========================================================
         */

        if (
            response.getStatusCode() >= 200 &&
            response.getStatusCode() < 300
        ) {

            Map<String, Object> responseMap =
                (Map<String, Object>)
                JSON.deserializeUntyped(
                    response.getBody()
                );


            String stripeAccountId =
                (String) responseMap.get('id');


            /*
             * Make sure Stripe returned Account ID.
             */
            if (
                String.isBlank(
                    stripeAccountId
                )
            ) {

                throw new StripeConnectException(
                    'Stripe did not return a Connected Account ID.'
                );
            }


            /*
             * =====================================================
             * SAVE STRIPE ACCOUNT ON PROFILE
             * =====================================================
             */

            update new Grant_Program__c(
                Id =
                    profile.Id,

                Stripe_Connected_Account_ID__c =
                    stripeAccountId,

                Stripe_Onboarding_Status__c =
                    'Onboarding'
            );


            return stripeAccountId;
        }


        /*
         * =========================================================
         * STRIPE ERROR
         * =========================================================
         */

        throw new StripeConnectException(
            'Stripe account creation failed: ' +
            extractStripeError(
                response.getBody()
            )
        );
    }


    /*
     * =========================================================
     * GET PROFILE DISPLAY NAME
     * =========================================================
     *
     * Only uses fields that are common to the Profile.
     *
     * We DO NOT use:
     * Company_Name__c
     * Institution_Name__c
     * NGO_Name__c
     * =========================================================
     */

    private static String getProfileDisplayName(
        Grant_Program__c profile
    ) {

        if (
            String.isNotBlank(
                profile.Primary_Contact_Name__c
            )
        ) {

            return profile.Primary_Contact_Name__c;
        }


        if (
            String.isNotBlank(
                profile.Name
            )
        ) {

            return profile.Name;
        }


        return 'GEMS Profile';
    }


    /*
     * =========================================================
     * CONVERT COUNTRY
     * =========================================================
     *
     * Country__c is a Lookup to Country.
     *
     * We receive Country__r.Name and convert it into
     * the two-letter ISO country code required by Stripe.
     * =========================================================
     */

    private static String convertCountryToStripeCode(
        String country
    ) {

        if (
            String.isBlank(country)
        ) {

            return null;
        }


        String normalized =
            country.trim().toLowerCase();


        Map<String, String> countryMap =
            new Map<String, String>{

                'india' =>
                    'IN',

                'united states' =>
                    'US',

                'united states of america' =>
                    'US',

                'usa' =>
                    'US',

                'us' =>
                    'US',

                'united kingdom' =>
                    'GB',

                'uk' =>
                    'GB',

                'great britain' =>
                    'GB',

                'canada' =>
                    'CA',

                'australia' =>
                    'AU',

                'singapore' =>
                    'SG',

                'germany' =>
                    'DE',

                'france' =>
                    'FR',

                'ireland' =>
                    'IE',

                'netherlands' =>
                    'NL',

                'new zealand' =>
                    'NZ',

                'japan' =>
                    'JP',

                'south korea' =>
                    'KR',

                'south africa' =>
                    'ZA',

                'kenya' =>
                    'KE',

                'nigeria' =>
                    'NG',

                'ghana' =>
                    'GH',

                'switzerland' =>
                    'CH',

                'sweden' =>
                    'SE',

                'norway' =>
                    'NO',

                'denmark' =>
                    'DK',

                'finland' =>
                    'FI',

                'italy' =>
                    'IT',

                'spain' =>
                    'ES',

                'belgium' =>
                    'BE',

                'austria' =>
                    'AT',

                'portugal' =>
                    'PT',

                'poland' =>
                    'PL'
            };


        return countryMap.get(
            normalized
        );
    }


    /*
     * =========================================================
     * EXTRACT STRIPE ERROR
     * =========================================================
     */

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

            // Return raw Stripe response below.
        }


        return responseBody;
    }


    /*
     * =========================================================
     * CUSTOM EXCEPTION
     * =========================================================
     */

    public class StripeConnectException
        extends Exception {
    }


    /*
     * =========================================================
     * CREATE STRIPE ACCOUNT
     * =========================================================
     *
     * Called from the LWC.
     *
     * The LWC is now on the Profile record page, so
     * recordId = Grant_Program__c Id.
     * =========================================================
     */

    @AuraEnabled
    public static String createStripeAccount(
        Id grantProgramId
    ) {

        if (
            grantProgramId == null
        ) {

            throw new StripeConnectException(
                'Profile ID is required.'
            );
        }


        return createConnectedAccount(
            grantProgramId
        );
    }


    /*
     * =========================================================
     * CREATE STRIPE ONBOARDING LINK
     * =========================================================
     *
     * Receives Profile ID.
     * =========================================================
     */

    @AuraEnabled
    public static String createStripeOnboardingLink(
        Id grantProgramId
    ) {

        /*
         * ---------------------------------------------------------
         * Get Profile
         * ---------------------------------------------------------
         */

        Grant_Program__c profile = [
            SELECT
                Id,
                Stripe_Connected_Account_ID__c,
                Stripe_Onboarding_Status__c
            FROM Grant_Program__c
            WHERE Id = :grantProgramId
            LIMIT 1
        ];


        /*
         * ---------------------------------------------------------
         * Validate Stripe Account
         * ---------------------------------------------------------
         */

        if (
            String.isBlank(
                profile.Stripe_Connected_Account_ID__c
            )
        ) {

            throw new StripeConnectException(
                'Stripe Connected Account has not been created for this Profile yet.'
            );
        }


        String stripeAccountId =
            profile.Stripe_Connected_Account_ID__c;


        /*
         * ---------------------------------------------------------
         * Salesforce Base URL & Return / Refresh URLs
         * ---------------------------------------------------------
         * Supports both Experience Cloud (Community) and CRM Lightning.
         * ---------------------------------------------------------
         */

        String siteUrl = Site.getBaseUrl();
        String baseUrl;
        String returnUrl;
        String refreshUrl;

        if (String.isNotBlank(siteUrl)) {
            baseUrl = siteUrl;
            returnUrl = baseUrl + '/s/profile?stripe_return=true';
            refreshUrl = baseUrl + '/s/profile';
        } else {
            baseUrl = URL.getOrgDomainUrl().toExternalForm();
            returnUrl =
                baseUrl +
                '/lightning/n/Stripe_Onboarding_Return' +
                '?c__recordId=' +
                EncodingUtil.urlEncode(
                    String.valueOf(grantProgramId),
                    'UTF-8'
                );
            refreshUrl =
                baseUrl +
                '/lightning/r/Grant_Program__c/' +
                grantProgramId +
                '/view';
        }


        /*
         * =========================================================
         * STRIPE ACCOUNT LINK REQUEST
         * =========================================================
         */

        HttpRequest request =
            new HttpRequest();


        request.setEndpoint(
            ACCOUNT_LINK_ENDPOINT
        );


        request.setMethod(
            'POST'
        );


        request.setHeader(
            'Content-Type',
            'application/json'
        );


        request.setHeader(
            'Stripe-Version',
            STRIPE_API_VERSION
        );


        /*
         * ---------------------------------------------------------
         * Recipient onboarding configuration
         * ---------------------------------------------------------
         */

        Map<String, Object> accountOnboarding =
            new Map<String, Object>{

                'configurations' =>
                    new List<String>{
                        'recipient'
                    },

                'refresh_url' =>
                    refreshUrl,

                'return_url' =>
                    returnUrl
            };


        Map<String, Object> useCase =
            new Map<String, Object>{

                'type' =>
                    'account_onboarding',

                'account_onboarding' =>
                    accountOnboarding
            };


        Map<String, Object> requestBody =
            new Map<String, Object>{

                'account' =>
                    stripeAccountId,

                'use_case' =>
                    useCase
            };


        request.setBody(
            JSON.serialize(
                requestBody
            )
        );


        /*
         * =========================================================
         * DEBUG
         * =========================================================
         */

        System.debug(
            LoggingLevel.ERROR,
            '========== STRIPE ONBOARDING LINK =========='
        );

        System.debug(
            LoggingLevel.ERROR,
            'PROFILE ID: ' +
            grantProgramId
        );

        System.debug(
            LoggingLevel.ERROR,
            'STRIPE ACCOUNT ID: ' +
            stripeAccountId
        );

        System.debug(
            LoggingLevel.ERROR,
            'RETURN URL: ' +
            returnUrl
        );

        System.debug(
            LoggingLevel.ERROR,
            'REFRESH URL: ' +
            refreshUrl
        );

        System.debug(
            LoggingLevel.ERROR,
            'REQUEST BODY: ' +
            JSON.serialize(
                requestBody
            )
        );


        /*
         * =========================================================
         * SEND REQUEST
         * =========================================================
         */

        Http http =
            new Http();


        HttpResponse response;


        try {

            response =
                http.send(request);

        } catch (Exception ex) {

            throw new StripeConnectException(
                'Stripe onboarding callout failed: ' +
                ex.getMessage()
            );
        }


        /*
         * =========================================================
         * DEBUG RESPONSE
         * =========================================================
         */

        System.debug(
            LoggingLevel.ERROR,
            'STRIPE ONBOARDING STATUS: ' +
            response.getStatusCode()
        );


        System.debug(
            LoggingLevel.ERROR,
            'STRIPE ONBOARDING RESPONSE: ' +
            response.getBody()
        );


        /*
         * =========================================================
         * SUCCESS
         * =========================================================
         */

        if (
            response.getStatusCode() >= 200 &&
            response.getStatusCode() < 300
        ) {

            Map<String, Object> responseMap =
                (Map<String, Object>)
                JSON.deserializeUntyped(
                    response.getBody()
                );


            String onboardingUrl =
                (String) responseMap.get(
                    'url'
                );


            if (
                String.isBlank(
                    onboardingUrl
                )
            ) {

                throw new StripeConnectException(
                    'Stripe did not return an onboarding URL.'
                );
            }


            return onboardingUrl;
        }


        /*
         * =========================================================
         * STRIPE ERROR
         * =========================================================
         */

        throw new StripeConnectException(
            'Stripe onboarding link creation failed: ' +
            extractStripeError(
                response.getBody()
            )
        );
    }


    /*
     * =========================================================
     * CHECK STRIPE ONBOARDING
     * =========================================================
     *
     * Receives Profile ID.
     *
     * Updates:
     *
     * Grant_Program__c.Stripe_Onboarding_Status__c
     * =========================================================
     */

    @AuraEnabled
    public static String checkStripeOnboarding(
        Id grantProgramId
    ) {

        /*
         * ---------------------------------------------------------
         * Get Profile
         * ---------------------------------------------------------
         */

        Grant_Program__c profile = [
            SELECT
                Id,
                Stripe_Connected_Account_ID__c,
                Stripe_Onboarding_Status__c
            FROM Grant_Program__c
            WHERE Id = :grantProgramId
            LIMIT 1
        ];


        /*
         * ---------------------------------------------------------
         * Validate Stripe Account
         * ---------------------------------------------------------
         */

        if (
            String.isBlank(
                profile.Stripe_Connected_Account_ID__c
            )
        ) {

            throw new StripeConnectException(
                'Stripe Connected Account does not exist for this Profile.'
            );
        }


        String stripeAccountId =
            profile.Stripe_Connected_Account_ID__c;


        /*
         * =========================================================
         * GET STRIPE ACCOUNT
         * =========================================================
         */

        HttpRequest request =
            new HttpRequest();


        request.setEndpoint(
            ACCOUNTS_ENDPOINT +
            '/' +
            EncodingUtil.urlEncode(
                stripeAccountId,
                'UTF-8'
            ) +
            '?include=requirements' +
            '&include=configuration.recipient'
        );


        request.setMethod(
            'GET'
        );


        request.setHeader(
            'Stripe-Version',
            STRIPE_API_VERSION
        );


        request.setHeader(
            'Content-Type',
            'application/json'
        );


        Http http =
            new Http();


        HttpResponse response;


        try {

            response =
                http.send(request);

        } catch (Exception ex) {

            throw new StripeConnectException(
                'Stripe account status check failed: ' +
                ex.getMessage()
            );
        }


        /*
         * =========================================================
         * DEBUG
         * =========================================================
         */

        System.debug(
            LoggingLevel.ERROR,
            '========== STRIPE STATUS CHECK =========='
        );

        System.debug(
            LoggingLevel.ERROR,
            'PROFILE ID: ' +
            profile.Id
        );

        System.debug(
            LoggingLevel.ERROR,
            'STRIPE ACCOUNT ID: ' +
            stripeAccountId
        );

        System.debug(
            LoggingLevel.ERROR,
            'STATUS CODE: ' +
            response.getStatusCode()
        );

        System.debug(
            LoggingLevel.ERROR,
            'STRIPE RESPONSE: ' +
            response.getBody()
        );


        /*
         * =========================================================
         * VALIDATE RESPONSE
         * =========================================================
         */

        if (
            response.getStatusCode() < 200 ||
            response.getStatusCode() >= 300
        ) {

            throw new StripeConnectException(
                'Stripe account status check failed: ' +
                extractStripeError(
                    response.getBody()
                )
            );
        }


        /*
         * =========================================================
         * PARSE RESPONSE
         * =========================================================
         */

        Map<String, Object> account =
            (Map<String, Object>)
            JSON.deserializeUntyped(
                response.getBody()
            );


        /*
         * =========================================================
         * REQUIREMENTS
         * =========================================================
         */

        Map<String, Object> requirements =
            null;


        if (
            account.containsKey(
                'requirements'
            ) &&
            account.get(
                'requirements'
            ) != null
        ) {

            requirements =
                (Map<String, Object>)
                account.get(
                    'requirements'
                );
        }


        System.debug(
            LoggingLevel.ERROR,
            'STRIPE REQUIREMENTS: ' +
            requirements
        );


        if (
            requirements == null
        ) {

            throw new StripeConnectException(
                'Stripe did not return account requirements. ' +
                'Full response: ' +
                response.getBody()
            );
        }


        /*
         * ---------------------------------------------------------
         * Currently Due
         * ---------------------------------------------------------
         */

        List<Object> currentlyDue =
            new List<Object>();


        if (
            requirements.containsKey(
                'currently_due'
            ) &&
            requirements.get(
                'currently_due'
            ) != null
        ) {

            currentlyDue =
                (List<Object>)
                requirements.get(
                    'currently_due'
                );
        }


        /*
         * ---------------------------------------------------------
         * Past Due
         * ---------------------------------------------------------
         */

        List<Object> pastDue =
            new List<Object>();


        if (
            requirements.containsKey(
                'past_due'
            ) &&
            requirements.get(
                'past_due'
            ) != null
        ) {

            pastDue =
                (List<Object>)
                requirements.get(
                    'past_due'
                );
        }


        /*
         * ---------------------------------------------------------
         * Pending Verification
         * ---------------------------------------------------------
         */

        List<Object> pendingVerification =
            new List<Object>();


        if (
            requirements.containsKey(
                'pending_verification'
            ) &&
            requirements.get(
                'pending_verification'
            ) != null
        ) {

            pendingVerification =
                (List<Object>)
                requirements.get(
                    'pending_verification'
                );
        }


        System.debug(
            LoggingLevel.ERROR,
            'CURRENTLY DUE: ' +
            currentlyDue
        );


        System.debug(
            LoggingLevel.ERROR,
            'PAST DUE: ' +
            pastDue
        );


        System.debug(
            LoggingLevel.ERROR,
            'PENDING VERIFICATION: ' +
            pendingVerification
        );


        /*
         * =========================================================
         * RECIPIENT CONFIGURATION
         * =========================================================
         */

        Map<String, Object> configuration =
            null;


        if (
            account.containsKey(
                'configuration'
            ) &&
            account.get(
                'configuration'
            ) != null
        ) {

            configuration =
                (Map<String, Object>)
                account.get(
                    'configuration'
                );
        }


        System.debug(
            LoggingLevel.ERROR,
            'STRIPE CONFIGURATION: ' +
            configuration
        );


        /*
         * ---------------------------------------------------------
         * Recipient
         * ---------------------------------------------------------
         */

        Map<String, Object> recipient =
            null;


        if (
            configuration != null &&
            configuration.containsKey(
                'recipient'
            ) &&
            configuration.get(
                'recipient'
            ) != null
        ) {

            recipient =
                (Map<String, Object>)
                configuration.get(
                    'recipient'
                );
        }


        System.debug(
            LoggingLevel.ERROR,
            'STRIPE RECIPIENT CONFIGURATION: ' +
            recipient
        );


        /*
         * =========================================================
         * RECIPIENT CAPABILITIES
         * =========================================================
         */

        Map<String, Object> capabilities =
            null;


        if (
            recipient != null &&
            recipient.containsKey(
                'capabilities'
            ) &&
            recipient.get(
                'capabilities'
            ) != null
        ) {

            capabilities =
                (Map<String, Object>)
                recipient.get(
                    'capabilities'
                );
        }


        System.debug(
            LoggingLevel.ERROR,
            'STRIPE RECIPIENT CAPABILITIES: ' +
            capabilities
        );


        /*
         * ---------------------------------------------------------
         * Stripe Balance
         * ---------------------------------------------------------
         */

        Map<String, Object> stripeBalance =
            null;


        if (
            capabilities != null &&
            capabilities.containsKey(
                'stripe_balance'
            ) &&
            capabilities.get(
                'stripe_balance'
            ) != null
        ) {

            stripeBalance =
                (Map<String, Object>)
                capabilities.get(
                    'stripe_balance'
                );
        }


        System.debug(
            LoggingLevel.ERROR,
            'STRIPE BALANCE: ' +
            stripeBalance
        );


        /*
         * ---------------------------------------------------------
         * Stripe Transfers
         * ---------------------------------------------------------
         */

        Map<String, Object> stripeTransfers =
            null;


        if (
            stripeBalance != null &&
            stripeBalance.containsKey(
                'stripe_transfers'
            ) &&
            stripeBalance.get(
                'stripe_transfers'
            ) != null
        ) {

            stripeTransfers =
                (Map<String, Object>)
                stripeBalance.get(
                    'stripe_transfers'
                );
        }


        System.debug(
            LoggingLevel.ERROR,
            'STRIPE TRANSFERS CAPABILITY: ' +
            stripeTransfers
        );


        /*
         * ---------------------------------------------------------
         * Transfer Capability Status
         * ---------------------------------------------------------
         */

        String transferStatus =
            null;


        if (
            stripeTransfers != null &&
            stripeTransfers.containsKey(
                'status'
            ) &&
            stripeTransfers.get(
                'status'
            ) != null
        ) {

            transferStatus =
                String.valueOf(
                    stripeTransfers.get(
                        'status'
                    )
                );
        }


        System.debug(
            LoggingLevel.ERROR,
            'STRIPE TRANSFERS STATUS: ' +
            transferStatus
        );


        /*
         * =========================================================
         * REQUIREMENTS CHECK
         * =========================================================
         */

        if (
            !currentlyDue.isEmpty() ||
            !pastDue.isEmpty()
        ) {

            update new Grant_Program__c(
                Id =
                    profile.Id,

                Stripe_Onboarding_Status__c =
                    'Onboarding'
            );


            return 'Onboarding';
        }


        /*
         * =========================================================
         * PENDING VERIFICATION
         * =========================================================
         */

        if (
            !pendingVerification.isEmpty()
        ) {

            update new Grant_Program__c(
                Id =
                    profile.Id,

                Stripe_Onboarding_Status__c =
                    'Onboarding'
            );


            return 'Onboarding';
        }


        /*
         * =========================================================
         * TRANSFER CAPABILITY ACTIVE
         * =========================================================
         */

        if (
            transferStatus == 'active'
        ) {

            System.debug(
                LoggingLevel.ERROR,
                'Stripe transfer capability is ACTIVE.'
            );


            update new Grant_Program__c(
                Id =
                    profile.Id,

                Stripe_Onboarding_Status__c =
                    'Completed'
            );


            return 'Completed';
        }


        /*
         * =========================================================
         * CAPABILITY NOT ACTIVE
         * =========================================================
         */

        System.debug(
            LoggingLevel.ERROR,
            'Stripe transfer capability is NOT ACTIVE. ' +
            'Current status: ' +
            transferStatus
        );


        update new Grant_Program__c(
            Id =
                profile.Id,

            Stripe_Onboarding_Status__c =
                'Onboarding'
        );


        return 'Onboarding';
    }
}