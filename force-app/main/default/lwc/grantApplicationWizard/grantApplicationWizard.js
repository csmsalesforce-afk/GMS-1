import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';
import { NavigationMixin } from 'lightning/navigation';

import saveApplication from '@salesforce/apex/GrantApplicationController1.saveApplication';
import submitApplication from '@salesforce/apex/GrantApplicationController1.submitApplication';
import getApplicantInfo from '@salesforce/apex/GrantApplicationController1.getApplicantInfo';
import getProgramInfo from '@salesforce/apex/GrantApplicationController1.getProgramInfo';
import getApplication from '@salesforce/apex/GrantApplicationController1.getApplication';
import getProgramDocuments from '@salesforce/apex/GrantProgramsController.getProgramDocuments';
import getUploadedFiles from '@salesforce/apex/GrantApplicationController1.getUploadedFiles';
import fixFileVisibility from '@salesforce/apex/GrantApplicationController1.fixFileVisibility';

export default class GrantApplicationWizard extends NavigationMixin(LightningElement) {

    @track step = 1;
    @track application = {};
    @track applicantName;
    @track programName;

    @track documents = [];
    @track uploadedFiles = [];
    uploadedDocs = new Set();
    isConfirmed = false;

    recordId;
    programId;

    // ================= URL PARAMETERS =================
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.programId = currentPageReference.state?.programId;
            this.recordId = currentPageReference.state?.recordId;
        }
    }

    // ================= INITIAL LOAD =================
    async connectedCallback() {
        try {

            // EDIT MODE
            if (this.recordId) {

                const existingApp = await getApplication({
                    recordId: this.recordId
                });

                this.application = { ...existingApp };

                this.programId = existingApp.Program__c;
                this.programName = existingApp.Program__r?.Name;
                this.applicantName = existingApp.Applicant_Name__c;

                await this.loadDocuments();
                return;
            }

            // NEW MODE
            const applicant = await getApplicantInfo();
            this.applicantName = applicant.Name;
            this.application.Applicant_Name__c = applicant.Name;

            if (this.programId) {
                const program = await getProgramInfo({ programId: this.programId });
                this.programName = program.Name;
                this.application.Program__c = this.programId;

                await this.loadDocuments();
            }

        } catch (error) {
            this.showToast('Error', error.body?.message || error.message, 'error');
        }
    }

    // ================= LOAD PROGRAM DOCUMENTS =================
    async loadDocuments() {
        try {
            const result = await getProgramDocuments({
                programId: this.programId
            });

            this.documents = result || [];

        } catch (error) {
            console.error('Error loading documents', error);
        }
    }

    // ================= STEP CHECKS =================
    get isStep1() { return this.step === 1; }
    get isStep2() { return this.step === 2; }
    get isStep3() { return this.step === 3; }

    get step1Circle() { return this.step >= 1 ? 'circle active-circle' : 'circle'; }
    get step2Circle() { return this.step >= 2 ? 'circle active-circle' : 'circle'; }
    get step3Circle() { return this.step >= 3 ? 'circle active-circle' : 'circle'; }

    // ================= FIELD CHANGE =================
    handleChange(event) {
        const field = event.target.dataset.field;

        this.application = {
            ...this.application,
            [field]: event.target.value
        };
    }

    // ================= SAVE =================
    async saveDraft() {
        try {

            this.application.Program__c = this.programId;

            const result = await saveApplication({
                app: this.application
            });

            this.recordId = result;

            this.showToast('Success', 'Draft saved successfully', 'success');

        } catch (error) {
            this.showToast('Error', error.body?.message || error.message, 'error');
        }
    }

    // ================= NEXT =================
    async nextStep() {

        if (this.step === 1) {

            const inputs = this.template.querySelectorAll(
                'lightning-input:not([disabled]), lightning-textarea'
            );

            let isValid = true;

            inputs.forEach(input => {
                if (!input.checkValidity()) {
                    input.reportValidity();
                    isValid = false;
                }
            });

            if (!isValid) return;

            if (!this.recordId) {
                await this.saveDraft();
            }
        }

        this.step++;

        // Always reload uploaded files when entering step 3
        if (this.step === 3 && this.recordId) {
            // Wait a bit for Salesforce to process files, then load
            await new Promise(resolve => setTimeout(resolve, 500));
            await this.loadUploadedFiles();
        }
    }

    // ================= PREVIOUS =================
    prevStep() {
        if (this.step > 1) {
            this.step--;
        }
    }

    // ================= FILE UPLOAD =================
    async handleUploadFinished(event) {

        const uploadedFiles = event.detail.files;
        const docId = event.target.dataset.id;
        const uploadedFile = uploadedFiles[0];

        this.uploadedDocs.add(docId);

        await fixFileVisibility({ documentId: uploadedFile.documentId });

        this.documents = this.documents.map(doc => {
            if (doc.Id === docId) {
                return {
                    ...doc,
                    uploaded: true,
                    uploadedFileName: uploadedFile.name,
                    uploadedFileId: uploadedFile.documentId
                };
            }
            return doc;
        });

        this.showToast('Success','File uploaded successfully','success');
        
        // Refresh uploaded files list after a delay
        if (this.recordId) {
            setTimeout(async () => {
                await this.loadUploadedFiles();
            }, 1000);
        }
    }

    // ================= VALIDATE DOCUMENTS =================
    validateDocuments() {

        let missing = [];

        this.documents.forEach(doc => {
            if (doc.Is_Mandatory__c && !this.uploadedDocs.has(doc.Id)) {
                missing.push(doc.Name);
            }
        });

        if (missing.length > 0) {
            this.showToast(
                'Error',
                'Please upload mandatory documents: ' + missing.join(', '),
                'error'
            );
            return false;
        }

        return true;
    }

    // ================= SUBMIT =================
    async submitApplication() {
        try {

            if (!this.recordId) {
                await this.saveDraft();
            }

            if (!this.validateDocuments()) {
                return;
            }

            await submitApplication({
                appId: this.recordId
            });

            this.showToast(
                'Success',
                'Application submitted successfully',
                'success'
            );

            // 🔥 REDIRECT TO DETAILS PAGE
            setTimeout(() => {
                this[NavigationMixin.Navigate]({
                    type: 'comm__namedPage',
                    attributes: {
                        name: 'application_details__c'
                    },
                    state: {
                        recordId: this.recordId
                    }
                });
            }, 800);

        } catch (error) {
            this.showToast(
                'Error',
                error.body?.message || error.message,
                'error'
            );
        }
    }

    async loadUploadedFiles() {
        try {
            console.log('Loading uploaded files for recordId:', this.recordId);

            const files = await getUploadedFiles({
                recordId: this.recordId
            });

            console.log('Loaded files:', files);

            this.uploadedFiles = files.map(file => {
                return {
                    ...file,
                    fileUrl: window.location.origin +
                             '/sfc/servlet.shepherd/version/download/' +
                             file.ContentDocument.LatestPublishedVersionId
                };
            });

            console.log('Uploaded files array:', this.uploadedFiles);

        } catch (error) {
            console.error('Error loading files', error);
            this.uploadedFiles = [];
        }
    }


    goToStep1() {
        this.step = 1;
    }

    goToStep2() {
        this.step = 2;
    }

    handleConfirmationChange(event) {
        this.isConfirmed = event.target.checked;
    }

    // ================= TOAST =================
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}