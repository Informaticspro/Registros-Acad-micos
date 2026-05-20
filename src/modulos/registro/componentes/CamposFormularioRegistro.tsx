import {
  CONGRESO_CATEGORY_OPTIONS,
  CONGRESO_MODALITY_OPTIONS,
  CONGRESO_NATIONALITY_OPTIONS,
  CONGRESO_PARTICIPATION_TYPE_OPTIONS,
  CONGRESO_SEX_OPTIONS,
  InscripcionFormKind,
} from '@/modulos/registro/configuracion-registro';

type Props = {
  formKind: InscripcionFormKind;
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

export function CamposFormularioRegistro({ formKind }: Props) {
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
        {formKind === 'congreso' ? 'Correo' : 'Correo institucional'}
        <input name="email" required type="email" placeholder="correo@institucion.edu" autoComplete="email" />
      </label>
      {formKind === 'congreso' ? (
        <>
          <RadioGroup legend="Sexo" name="sex" options={CONGRESO_SEX_OPTIONS} />
          <RadioGroup legend="Nacionalidad" name="nationality" options={CONGRESO_NATIONALITY_OPTIONS} />
          <label>
            Correo P.
            <input name="personalEmail" required type="email" placeholder="correo.personal@gmail.com" />
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
          <label>
            Entidad
            <input name="entity" required placeholder="Ej. Universidad, institucion o empresa" />
          </label>
        </>
      ) : null}
    </>
  );
}
