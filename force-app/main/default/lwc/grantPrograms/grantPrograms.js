import { LightningElement, wire } from 'lwc';
import getPrograms from '@salesforce/apex/GrantProgramsController.getPrograms';
import { NavigationMixin } from 'lightning/navigation';

export default class GrantPrograms extends NavigationMixin(LightningElement) {

    programs = [];

    @wire(getPrograms)
    wiredPrograms({ data, error }) {
        if (data) {

            this.programs = data.map(program => {

                let statusClass = 'status-badge open';

                if (program.Status__c === 'Closed') {
                    statusClass = 'status-badge closed';
                }

                let shortDescription = program.Description__c
                    ? program.Description__c.substring(0, 120) + '...'
                    : '';

                return {
                    ...program,
                    statusClass,
                    shortDescription
                };
            });

        } else if (error) {
            console.error(error);
        }
    }

    

    handleApply(event) {
    const programId = event.currentTarget.dataset.id;

    this[NavigationMixin.Navigate]({
        type: 'comm__namedPage',
        attributes: {
            name: 'Program_Details__c'
        },
        state: {
            programId: programId
        }
    });
}
}