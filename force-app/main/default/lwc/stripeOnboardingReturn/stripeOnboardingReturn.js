import {
    LightningElement,
    wire
} from 'lwc';

import {
    CurrentPageReference,
    NavigationMixin
} from 'lightning/navigation';

import checkStripeOnboarding
    from '@salesforce/apex/StripeConnectService.checkStripeOnboarding';


export default class StripeOnboardingReturn
    extends NavigationMixin(LightningElement) {

    processed = false;


    @wire(CurrentPageReference)
    wiredPageReference(pageRef) {

        if (
            pageRef &&
            !this.processed
        ) {

            /*
             * Apex puts the Profile ID into:
             *
             * c__recordId
             */

            const recordId =
                pageRef.state?.c__recordId;


            if (recordId) {

                this.processed = true;

                this.processReturn(
                    recordId
                );
            }
        }
    }


    async processReturn(recordId) {

        try {

            /*
             * recordId is now the
             * Grant_Program__c Profile ID.
             */

            await checkStripeOnboarding({
                grantProgramId: recordId
            });


            /*
             * Return to the Profile record.
             */

            this[
                NavigationMixin.Navigate
            ]({

                type:
                    'standard__recordPage',

                attributes: {

                    recordId:
                        recordId,

                    objectApiName:
                        'Grant_Program__c',

                    actionName:
                        'view'
                }
            });


        } catch (error) {

            console.error(
                'Stripe onboarding status check failed',
                error
            );


            /*
             * If status checking fails,
             * still return to the Profile record.
             */

            this[
                NavigationMixin.Navigate
            ]({

                type:
                    'standard__recordPage',

                attributes: {

                    recordId:
                        recordId,

                    objectApiName:
                        'Grant_Program__c',

                    actionName:
                        'view'
                }
            });
        }
    }
}