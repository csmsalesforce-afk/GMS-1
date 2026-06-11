import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getApplicantAndDisbursement from '@salesforce/apex/FundUtilizationController.getApplicantAndDisbursement';
import createFundUtilization from '@salesforce/apex/FundUtilizationController.createFundUtilization';

export default class FundUtilizationForm extends LightningElement {

    @track applicationId;
    @track disbursementId;
    @track hasDisbursement = false;
    @track uploadedFileIds = [];

    @track applicationName;
    @track disbursementName;

    /* GET APPLICATION ID FROM URL */
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.applicationId = currentPageReference.state?.recordId;

            if (this.applicationId) {
                this.fetchData();
            }
        }
    }

    /* FETCH DATA */
    fetchData() {
        getApplicantAndDisbursement({ applicationId: this.applicationId })
            .then(result => {
                this.hasDisbursement = result.hasDisbursement;

                if (result.hasDisbursement) {
                    this.disbursementId = result.disbursementId;
                    this.applicationName = result.applicationName;
                    this.disbursementName = result.disbursementName;
                }
            })
            .catch(error => {
                console.error(error);
            });
    }

    /* FILE UPLOAD */
    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;

        this.uploadedFileIds = [];

        uploadedFiles.forEach(file => {
            this.uploadedFileIds.push(file.documentId);
        });

        this.showToast('Success', 'Files uploaded successfully', 'success');
    }

    /* 🔥 SUBMIT BUTTON HANDLER */
    handleSubmit() {

        createFundUtilization({
            applicationId: this.applicationId,
            disbursementId: this.disbursementId,
            fileIds: this.uploadedFileIds
        })
        .then(recordId => {

            this.showToast('Success', 'Record created successfully', 'success');

            this.navigateBackWithFlag();

        })
        .catch(error => {
            console.error(error);
            this.showToast('Error', 'Error creating record', 'error');
        });
    }

    /* TOAST */
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }

    /* NAVIGATION */
    navigateBackWithFlag() {
        sessionStorage.setItem('fundUtilSuccess', 'true');
        window.history.back();
    }
}