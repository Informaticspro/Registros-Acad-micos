import { RegistrationFormKind } from '@/features/registration/registration-config';

type Props = {
  formKind: RegistrationFormKind;
};

export function RegistrationFormFields({ formKind }: Props) {
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
        Cédula
        <input name="documentId" required placeholder="Ej. 8-888-111" autoComplete="off" />
      </label>
      <label>
        {formKind === 'congreso' ? 'Correo' : 'Correo institucional'}
        <input name="email" required type="email" placeholder="correo@institucion.edu" autoComplete="email" />
      </label>
      {formKind === 'congreso' ? (
        <>
          <label>
            Sexo
            <select name="sex" required defaultValue="">
              <option value="" disabled>
                Seleccione
              </option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="otro">Otro</option>
              <option value="prefiere_no_decir">Prefiere no decir</option>
            </select>
          </label>
          <label>
            Categoría
            <input name="category" required placeholder="Ej. Estudiante, docente, investigador" />
          </label>
          <label>
            Correo P.
            <input name="personalEmail" required type="email" placeholder="correo.personal@gmail.com" />
          </label>
          <label>
            Nacionalidad
            <input name="nationality" required placeholder="Ej. Panameña" />
          </label>
          <label>
            Otra Nacionalidad
            <input name="otherNationality" placeholder="Opcional" />
          </label>
          <label>
            Modalidad
            <select name="modality" required defaultValue="">
              <option value="" disabled>
                Seleccione
              </option>
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual</option>
              <option value="hibrida">Híbrida</option>
            </select>
          </label>
          <label>
            Tipo Participación
            <select name="participationType" required defaultValue="">
              <option value="" disabled>
                Seleccione
              </option>
              <option value="asistente">Asistente</option>
              <option value="ponente">Ponente</option>
              <option value="organizador">Organizador</option>
              <option value="invitado">Invitado</option>
            </select>
          </label>
        </>
      ) : null}
    </>
  );
}
