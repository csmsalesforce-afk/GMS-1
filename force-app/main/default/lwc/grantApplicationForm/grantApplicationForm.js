import { LightningElement, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';

export default class GrantApplicationForm extends LightningElement {

    programId;
    programName = '';

   @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.programId = currentPageReference.state.c__programId;  
            console.log('Program ID in Form:', this.programId);
        }
    }

    handleSubmit(event) {
        console.log('Form submitting...');
    }

    handleSuccess(event) {
        console.log('Record Saved', event.detail.id);
    }

    handleDraft() {
        console.log('Draft Save Clicked');
    }
      goBack() {
        window.history.back();
    }
}