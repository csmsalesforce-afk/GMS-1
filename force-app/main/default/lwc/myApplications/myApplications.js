import { LightningElement, wire } from 'lwc';
import getMyApplications from '@salesforce/apex/MyApplicationsController.getMyApplications';
import { NavigationMixin } from 'lightning/navigation';

export default class MyApplications extends NavigationMixin(LightningElement) {

    applications = [];

    totalCount = 0;
    approvedCount = 0;
    underReviewCount = 0;
    draftCount = 0;
    withdrawnCount = 0;
    rejectedCount = 0;

    @wire(getMyApplications)
    wiredApps({ data, error }) {
        if (data) {

            // RESET COUNTS
            this.totalCount = 0;
            this.approvedCount = 0;
            this.underReviewCount = 0;
            this.draftCount = 0;
            this.withdrawnCount = 0;
            this.rejectedCount = 0;

            this.totalCount = data.length;

            this.applications = data.map(app => {

                let programName = app.Program__r?.Name || '';
                let statusClass = 'status-badge';
                let actionLabel = 'View details';

                const status = app.Application_Status__c;

                // APPROVED
                if (status === 'Approved') {
                    this.approvedCount++;
                    statusClass += ' approved';
                }

                // DRAFT
                else if (status === 'Draft') {
                    this.draftCount++;
                    statusClass += ' draft';
                    actionLabel = 'Resume';
                }

                // UNDER REVIEW (COMBINED LOGIC)
                else if (
                    status === 'Under Internal Review' ||
                    status === 'Under External Review' ||
                    status === 'Revision Requested'
                ) {
                    this.underReviewCount++;

                    if (status === 'Revision Requested') {
                        statusClass += ' revision';
                    } else {
                        statusClass += ' review';
                    }
                }

                // REJECTED
                else if (status === 'Rejected') {
                    this.rejectedCount++;
                    statusClass += ' rejected';
                }

                // WITHDRAWN
                else if (status === 'Withdrawn') {
                    this.withdrawnCount++;
                    statusClass += ' withdrawn';
                }

                // SUBMITTED (if exists separately)
                else if (status === 'Submitted') {
                    this.underReviewCount++;
                    statusClass += ' submitted';
                }

                return {
                    ...app,
                    programName,
                    statusClass,
                    actionLabel
                };
            });

        } else if (error) {
            console.error(error);
        }
    }

    handleAction(event) {

        const recordId = event.currentTarget.dataset.id;
        const status = event.currentTarget.dataset.status;

        // If Draft → Resume Wizard
        if (status === 'Draft') {

            this[NavigationMixin.Navigate]({
                type: 'comm__namedPage',
                attributes: {
                    name: 'Grant_Application__c'
                },
                state: {
                    recordId: recordId
                }
            });

        } else {

            // Otherwise → View Details Page
            this[NavigationMixin.Navigate]({
                type: 'comm__namedPage',
                attributes: {
                    name: 'application_details__c'
                },
                state: {
                    recordId: recordId
                }
            });

        }
    }
}