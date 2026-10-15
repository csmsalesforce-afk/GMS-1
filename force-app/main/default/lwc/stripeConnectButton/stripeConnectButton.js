import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import createStripeAccount
    from '@salesforce/apex/StripeConnectService.createStripeAccount';

import createStripeOnboardingLink
    from '@salesforce/apex/StripeConnectService.createStripeOnboardingLink';


export default class StripeConnectButton extends LightningElement {

    @api recordId;

    isLoading = false;
    onboardingUrl;


    async handleConnect() {

        this.isLoading = true;

        try {

            /*
             * Since this Quick Action is on
             * Grant_Program__c, recordId is the Profile ID.
             */

            await createStripeAccount({
                grantProgramId: this.recordId
            });


            /*
             * Create the Stripe onboarding link.
             */

            const url =
                await createStripeOnboardingLink({
                    grantProgramId: this.recordId
                });


            if (!url) {

                throw new Error(
                    'Stripe did not return an onboarding URL.'
                );
            }


            /*
             * Store the URL.
             *
             * The HTML <a> element will use this URL
             * directly when the user clicks the button.
             */

            this.onboardingUrl = url;


            this.showToast(
                'Success',
                'Stripe onboarding link is ready.',
                'success'
            );


        } catch (error) {

            let message = 'Unknown error';


            if (
                error?.body?.message
            ) {

                message =
                    error.body.message;

            } else if (
                error?.message
            ) {

                message =
                    error.message;
            }


            this.showToast(
                'Stripe Connection Error',
                message,
                'error'
            );


        } finally {

            this.isLoading = false;
        }
    }


    showToast(
        title,
        message,
        variant
    ) {

        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}