
import { CommonModule } from '@angular/common';

import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  PersonalInfoErrors,
  PersonalInfoFormData
} from './types';

import { InputDirective } from
      '../../../../shared/components/ui/input/input.directive';

@Component({
  selector: 'app-personal-details-fields',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputDirective
  ],
  templateUrl: './personal-details-fields.component.html'
})
export class PersonalDetailsFieldsComponent {

  @Input({ required: true })
  formData!: PersonalInfoFormData;

  @Input()
  errors: PersonalInfoErrors = {};

  @Output()
  fieldChange =
      new EventEmitter<keyof PersonalInfoFormData>();

  limpiarError(
      campo: keyof PersonalInfoFormData
  ): void {
    this.fieldChange.emit(campo);
  }
}
