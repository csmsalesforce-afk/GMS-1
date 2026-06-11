import { LightningElement, wire } from 'lwc';
import getApplicationStats from '@salesforce/apex/HomepageController.getApplicationStats';
import { NavigationMixin } from 'lightning/navigation';

export default class HomepageComponent extends NavigationMixin(LightningElement) {

    draftCount = 0;
    submittedCount = 0;
    approvedCount = 0;
    rejectedCount = 0;

    @wire(getApplicationStats)
    wiredStats({ data, error }) {
        if (data) {
            this.draftCount = data.draft;
            this.submittedCount = data.submitted;
            this.approvedCount = data.approved;
            this.rejectedCount = data.rejected;
        } else if (error) {
            console.error(error);
        }
    }

    handleApply() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'Grant_Applicant__c',
                actionName: 'new'
            }
        });
    }

    handleMyApplications() {
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'My_Applications'
            }
        });
    }
}