import { LightningElement, wire, track } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import PROFILE_OBJECT from '@salesforce/schema/Grant_Program__c';
import getFieldSetFields from '@salesforce/apex/ProfileFieldSetController.getFieldSetFields';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin} from 'lightning/navigation';

export default class CreateProfileWizard extends NavigationMixin(LightningElement) {

    step = 1;
    organizationType;
    recordTypeId;
    fieldSetName;

    @track fieldSetFields = [];

    recordTypeMap = {};

handleSubmitClick() {
    const form = this.template.querySelector('lightning-record-edit-form');
    if (form) {
        form.submit();
    }
}

handleSubmit(event) {
    // optional: modify fields before save
    console.log('Submitting record...');
}

handleSuccess(event) {

    const recordId = event.detail.id;

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Success',
            message: 'Profile Created Successfully!',
            variant: 'success'
        })
    );

    // Slight delay for smooth UX
    setTimeout(() => {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'profile_details__c'
            },
            state: {
                recordId: recordId
            }
        });
    }, 800);
}

handleError(event) {
    console.error('Error:', event.detail);

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Error creating record',
            message: event.detail.message,
            variant: 'error'
        })
    );
}

    fieldSetMap = {
        'Academic Institution': 'Academic_Institution',
        'Individual Applicant': 'Individual',
        'NGO': 'NGO',
        'Private Organisation': 'Private_Organisation'
    };

    orgTypeOptions = [
        { label: 'Academic Institution', value: 'Academic Institution' },
        { label: 'Individual Applicant', value: 'Individual Applicant' },
        { label: 'NGO', value: 'NGO' },
        { label: 'Private Organisation', value: 'Private Organisation' }
    ];

    @wire(getObjectInfo, { objectApiName: PROFILE_OBJECT })
    objectInfo({ data }) {
        if (data) {
            const rtInfos = data.recordTypeInfos;

            Object.keys(rtInfos).forEach(rtId => {
                const rt = rtInfos[rtId];
                this.recordTypeMap[rt.name] = rtId;
            });
        }
    }

    // 🔥 Reactive wire
    @wire(getFieldSetFields, { fieldSetName: '$fieldSetName' })
    wiredFields({ data, error }) {

        if (data) {
            console.log('Returned Fields:', data);
            this.fieldSetFields = data;
        }

        if (error) {
            console.error(error);
        }
    }

    get isStepOne() {
        return this.step === 1;
    }

    get isStepTwo() {
        return this.step === 2;
    }

    get isNextDisabled() {
        return !this.organizationType;
    }

    handleTypeChange(event) {
        this.organizationType = event.detail.value;
    }

    goToStepTwo() {

        this.recordTypeId = this.recordTypeMap[this.organizationType];

        // 🔥 CRITICAL
        this.fieldSetName = this.fieldSetMap[this.organizationType];

        console.log('FieldSetName set to:', this.fieldSetName);

        this.step = 2;
    }

    goBack() {
        this.step = 1;
    }

    handleTypeSelect(event) {

    this.organizationType = event.currentTarget.dataset.value;

    this.recordTypeId = this.recordTypeMap[this.organizationType];
    this.fieldSetName = this.fieldSetMap[this.organizationType];

    if (!this.recordTypeId || !this.fieldSetName) {
        console.warn('RecordType or FieldSet not ready yet.');
        return;
    }

    this.step = 2;
}
    
}