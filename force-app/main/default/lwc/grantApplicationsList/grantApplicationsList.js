import { LightningElement, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { NavigationMixin } from 'lightning/navigation';
import getApplicationsByProgram from '@salesforce/apex/GrantProgramController.getApplicationsByProgram';

export default class GrantApplicationsList extends NavigationMixin(LightningElement) {

    @track applications = [];
    programId;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {

            this.programId = currentPageReference.state.programId;

            if (this.programId) {
                this.loadApplications();
            }
        }
    }

    loadApplications() {

        getApplicationsByProgram({ programId: this.programId })
            .then(result => {

                this.applications = result.map((app, index) => {
                    return {
                        ...app,
                        slNo: index + 1,
                        applicantName: app.Account__r ? app.Account__r.Name : '',
                        formattedAmount: this.formatCurrency(app.Requested_Amount__c),
                        statusClass: this.getStatusClass(app.Application_Status__c)
                    };
                });

            })
            .catch(error => {
                console.error('Error loading applications', error);
            });
    }
handleReview(event){

    const applicationId = event.currentTarget.dataset.id;

    console.log('Application Id:', applicationId);

    window.location.href = '/gmsa/s/application-review?appId=' + applicationId;

}
    formatCurrency(amount) {
        if (!amount) return '$0';
        return '$' + amount.toLocaleString('en-US');
    }

    getStatusClass(status) {

        const statusMap = {
            'Under Internal Review': 'badge review',
            'Under External Review': 'badge external',
            'Revision Requested': 'badge revision',
            'Approved': 'badge approved',
            'Rejected': 'badge rejected'
        };

        return statusMap[status] || 'badge';
    }

}