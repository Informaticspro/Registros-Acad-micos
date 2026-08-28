import {
  CONGRESO_CATEGORY_OPTIONS,
  CONGRESO_MODALITY_OPTIONS,
  CONGRESO_NATIONALITY_OPTIONS,
  CONGRESO_PARTICIPATION_TYPE_OPTIONS,
  CONGRESO_SEX_OPTIONS,
  InscripcionFormKind,
  SEMINARIO_DATE_OPTIONS,
  SEMINARIO_DISABILITY_OPTIONS,
  SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT,
  SEMINARIO_FACULTY_OPTIONS,
  SEMINARIO_GENERAL_PARTICIPANT_TYPE_OPTIONS,
  SEMINARIO_GENERAL_REGIONAL_CENTER_OPTIONS,
  SEMINARIO_PARTICIPANT_TYPE_OPTIONS,
  SEMINARIO_PURPOSE_OPTIONS,
  SEMINARIO_REGIONAL_CENTER_OPTIONS,
  SEMINARIO_SEX_OPTIONS,
} from '@/modulos/registro/configuracion-registro';
import { FormularioPersonalizado } from '@/tipos/dominio';

type Props = {
  formKind: InscripcionFormKind;
  customFormSchema?: FormularioPersonalizado | null;
};

type RadioGroupProps = {
  legend: string;
  name: string;
  options: readonly string[];
};

function RadioGroup({ legend, name, options }: RadioGroupProps) {
  return (
    <fieldset className="choice-group">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label className="choice-option" key={option}>
          <input name={name} type="radio" value={option} required />
          <span>{option}</span>
        </label>
      ))}
    </fieldset>
  );
}

function getConfiguredOptions(
  customFormSchema: FormularioPersonalizado | null | undefined,
  fieldId: string,
  fallback: readonly string[],
) {
  const configuredOptions = customFormSchema?.fields.find((field) => field.id === fieldId)?.options ?? [];
  return configuredOptions.length > 0 ? configuredOptions : fallback;
}

function getEducationContent(customFormSchema: FormularioPersonalizado | null | undefined) {
  const content = customFormSchema?.educationContent ?? {};
  return {
    introText: content.introText?.trim() || SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT.introText,
    costText: content.costText?.trim() || SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT.costText,
    paymentText: content.paymentText?.trim() || SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT.paymentText,
    cancellationText:
      content.cancellationText?.trim() || SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT.cancellationText,
    capacityText: content.capacityText?.trim() || SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT.capacityText,
    considerations:
      content.considerations && content.considerations.length > 0
        ? content.considerations
        : SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT.considerations,
  };
}

function CustomField({ field }: { field: FormularioPersonalizado['fields'][number] }) {
  const fieldName = `custom_${field.id}`;
  const help = field.helpText ? <span className="field-hint">{field.helpText}</span> : null;

  if (field.type === 'textarea') {
    return (
      <label className="full-field">
        {field.label}
        <textarea name={fieldName} required={field.required} rows={4} />
        {help}
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label>
        {field.label}
        <select name={fieldName} required={field.required} defaultValue="">
          <option value="" disabled>
            Seleccione una opcion
          </option>
          {(field.options ?? []).map((option) => (
            <option value={option} key={option}>
              {option}
            </option>
          ))}
        </select>
        {help}
      </label>
    );
  }

  if (field.type === 'radio' || field.type === 'checkbox') {
    return (
      <fieldset className="choice-group full-field">
        <legend>{field.label}</legend>
        {(field.options ?? []).map((option) => (
          <label className="choice-option" key={option}>
            <input name={fieldName} type={field.type} value={option} required={field.required && field.type === 'radio'} />
            <span>{option}</span>
          </label>
        ))}
        {help}
      </fieldset>
    );
  }

  return (
    <label>
      {field.label}
      <input
        name={fieldName}
        required={field.required}
        type={field.type === 'email' ? 'email' : 'text'}
        inputMode={field.type === 'phone' ? 'tel' : undefined}
      />
      {help}
    </label>
  );
}

export function CamposFormularioRegistro({ formKind, customFormSchema }: Props) {
  const seminarDateOptions = getConfiguredOptions(customFormSchema, 'seminarDate', SEMINARIO_DATE_OPTIONS);
  const seminarPurposeOptions = getConfiguredOptions(customFormSchema, 'seminarPurpose', SEMINARIO_PURPOSE_OPTIONS);
  const educationContent = getEducationContent(customFormSchema);

  return (
    <>
      <label>
        Nombre
        <input name="firstName" required placeholder="Ej. Maria" autoComplete="given-name" />
      </label>
      <label>
        Apellido
        <input name="lastName" required placeholder="Ej. Gonzalez" autoComplete="family-name" />
      </label>
      <label>
        Cedula
        <input name="documentId" required placeholder="Ej. 8-888-111" autoComplete="off" />
      </label>
      <label>
        Correo institucional
        <input
          name="email"
          required
          type="email"
          placeholder={formKind === 'seminario' || formKind === 'seminario_general' ? 'correo@unachi.ac.pa' : 'correo@institucion.edu'}
          autoComplete="email"
        />
      </label>
      {formKind === 'seminario_general' ? (
        <>
          <label>
            Correo personal
            <input name="personalEmail" required type="email" placeholder="correo.personal@gmail.com" />
          </label>
          <RadioGroup legend="Sexo" name="sex" options={SEMINARIO_SEX_OPTIONS} />
          <label>
            Celular con WhatsApp
            <input name="phone" required placeholder="Ej. 6123-4567" inputMode="tel" />
          </label>
          <RadioGroup
            legend="Centro universitario al que pertenece"
            name="regionalCenter"
            options={SEMINARIO_GENERAL_REGIONAL_CENTER_OPTIONS}
          />
          <label className="full-field">
            Si pertenece a otra universidad, indique el nombre
            <input name="otherUniversity" placeholder="Ej. Universidad, institucion o centro externo" />
          </label>
          <RadioGroup legend="Es usted" name="participantType" options={SEMINARIO_GENERAL_PARTICIPANT_TYPE_OPTIONS} />
        </>
      ) : null}
      {formKind === 'personalizado' ? (
        <>
          {(customFormSchema?.fields ?? []).map((field) => (
            <CustomField field={field} key={field.id} />
          ))}
        </>
      ) : null}
      {formKind === 'seminario' ? (
        <>
          <label>
            Correo electronico personal
            <input name="personalEmail" required type="email" placeholder="correo.personal@gmail.com" />
          </label>
          <RadioGroup legend="Sexo" name="sex" options={SEMINARIO_SEX_OPTIONS} />
          <RadioGroup legend="Posee algun tipo de discapacidad" name="hasDisability" options={SEMINARIO_DISABILITY_OPTIONS} />
          <label>
            Si respondio SI, indique su discapacidad
            <input name="disabilityDetail" placeholder="Opcional" />
          </label>
          <label>
            Numero celular con WhatsApp
            <input name="phone" required placeholder="Ej. 6123-4567" inputMode="tel" />
          </label>
          <label>
            Correo para enlaces del aula virtual
            <input name="virtualClassEmail" required type="email" placeholder="correo para recibir enlaces" />
          </label>
          <fieldset className="choice-group full-field">
            <legend>Facultad donde esta realizando su especializacion</legend>
            {SEMINARIO_FACULTY_OPTIONS.map((option) => (
              <label className="choice-option" key={option}>
                <input name="faculty" type="radio" value={option} required />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <RadioGroup legend="Centro universitario al que pertenece" name="regionalCenter" options={SEMINARIO_REGIONAL_CENTER_OPTIONS} />
          <RadioGroup legend="Es usted" name="participantType" options={SEMINARIO_PARTICIPANT_TYPE_OPTIONS} />
          <fieldset className="choice-group full-field">
            <legend>Fecha de seminario disponible</legend>
            <aside className="seminar-info-card" aria-label="Informacion importante del seminario">
              <p>{educationContent.introText}</p>
              <ol className="seminar-letter-list" type="a">
                <li>
                  Costo del Seminario: <strong>{educationContent.costText}</strong>
                </li>
                <li>
                  {educationContent.paymentText}
                </li>
                <li>
                  <strong>{educationContent.cancellationText}</strong>
                </li>
                <li>
                  La cantidad de participantes por grupo sera de <strong>{educationContent.capacityText}</strong>.
                </li>
              </ol>
              <div className="seminar-warning">
                <strong>Consideraciones importantes</strong>
                <ul>
                  {educationContent.considerations.map((consideration) => (
                    <li key={consideration}>{consideration}</li>
                  ))}
                </ul>
              </div>
            </aside>
            {seminarDateOptions.map((option) => (
              <label className="choice-option" key={option}>
                <input name="seminarDate" type="radio" value={option} required />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="choice-group full-field">
            <legend>Usted tomara el seminario para</legend>
            {seminarPurposeOptions.map((option) => (
              <label className="choice-option" key={option}>
                <input name="seminarPurpose" type="radio" value={option} required />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
        </>
      ) : null}
      {formKind === 'congreso' ? (
        <>
          <RadioGroup legend="Sexo" name="sex" options={CONGRESO_SEX_OPTIONS} />
          <RadioGroup legend="Nacionalidad" name="nationality" options={CONGRESO_NATIONALITY_OPTIONS} />
          <label>
            Correo P.
            <input name="personalEmail" type="email" placeholder="Opcional si ya coloco correo institucional" />
          </label>
          <label>
            Otra Nacionalidad
            <input name="otherNationality" placeholder="Complete solo si marco Otra" />
          </label>
          <RadioGroup legend="Categoria" name="category" options={CONGRESO_CATEGORY_OPTIONS} />
          <fieldset className="choice-group full-field">
            <legend>Modalidad de participacion</legend>
            {CONGRESO_MODALITY_OPTIONS.map((option) => (
              <label className="choice-option" key={option.value}>
                <input name="modality" type="radio" value={option.label} required />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <RadioGroup
            legend="Tipo de participante"
            name="participationType"
            options={CONGRESO_PARTICIPATION_TYPE_OPTIONS}
          />
        </>
      ) : null}
    </>
  );
}
