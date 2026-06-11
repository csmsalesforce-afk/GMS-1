import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class ReviewerDashboard extends NavigationMixin(LightningElement){

navigatePrograms(){

this[NavigationMixin.Navigate]({

type:'standard__webPage',

attributes:{
url:'/program-list'
}

});

}

}