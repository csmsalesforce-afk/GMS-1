import { LightningElement, track } from 'lwc';

export default class Testcomponent extends LightningElement {
    @track message = '';

    handleClick() {
        this.message = 'Button clicked 🚀 LWC is working!';
    }
}