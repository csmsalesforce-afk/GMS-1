import { LightningElement } from 'lwc';

export default class Lwc1 extends LightningElement {

    name = '';
    showMessage = false;

    handleChange(event) {
        this.name = event.target.value;
        this.showMessage = false;
    }

    handleClick() {
        if(this.name) {
            this.showMessage = true;
        }
    }
}