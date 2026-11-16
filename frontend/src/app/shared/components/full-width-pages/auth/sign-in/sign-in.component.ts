import {CommonModule} from '@angular/common';
import {Component, Input} from '@angular/core';

import {SignInFormFieldsComponent} from './form.component';

@Component({
    selector: 'app-sign-in-content',
    standalone: true,
    imports: [
        CommonModule,
        SignInFormFieldsComponent
    ],
    templateUrl: './sign-in.component.html',
    host: {
        class: 'contents'
    },
    styles: [
        `
      :host {
        display: contents;
      }
    `
    ]
})
export class SignInContentComponent {

    @Input() className: string = '';

}
