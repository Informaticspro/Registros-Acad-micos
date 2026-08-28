import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import {
  SEMINARIO_DATE_OPTIONS,
  SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT,
  SEMINARIO_PURPOSE_OPTIONS,
} from '@/modulos/registro/configuracion-registro';
import { createEvent, getEvent, updateEvent } from '@/servicios/eventos.servicio';
import {
  CampoFormularioPersonalizado,
  ContenidoSeminarioEducacionContinua,
  EventoAcademico,
  TipoCampoFormularioPersonalizado,
} from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';
import { isRegistroPermanenteEvento } from '@/utilidades/estado-evento';

function getEditableStatus(status: EventoAcademico['status']) {
  if (status === 'draft' || status === 'archived') return status;
  return 'published';
}

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

type DuplicateEventState = {
  duplicateFrom?: EventoAcademico;
};

const customFieldTypeOptions: Array<{ value: TipoCampoFormularioPersonalizado; label: string }> = [
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'email', label: 'Correo' },
  { value: 'phone', label: 'Telefono' },
  { value: 'select', label: 'Lista desplegable' },
  { value: 'radio', label: 'Seleccion unica' },
  { value: 'checkbox', label: 'Seleccion multiple' },
];

function getDuplicateEventTitle(event?: EventoAcademico | null) {
  if (!event) return '';
  return `Copia de ${event.title}`;
}

function createCustomField(): CampoFormularioPersonalizado {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `campo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    label: '',
    type: 'text',
    required: false,
    helpText: '',
    options: [],
  };
}

function needsOptions(type: TipoCampoFormularioPersonalizado) {
  return type === 'select' || type === 'radio' || type === 'checkbox';
}

function parseOptions(value: string) {
  return value
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean);
}

function parseLines(value: string) {
  return parseOptions(value);
}

function getSchemaFieldOptions(event: EventoAcademico | null, fieldId: string, fallback: readonly string[]) {
  return event?.customFormSchema?.fields.find((field) => field.id === fieldId)?.options ?? [...fallback];
}

type EducationContentForm = {
  introText: string;
  costText: string;
  paymentText: string;
  cancellationText: string;
  capacityText: string;
  considerationsText: string;
};

function getEducationContent(event: EventoAcademico | null): Required<ContenidoSeminarioEducacionContinua> {
  const content = event?.customFormSchema?.educationContent ?? {};
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
        : [...SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT.considerations],
  };
}

function buildEducationContentForm(event: EventoAcademico | null): EducationContentForm {
  const content = getEducationContent(event);
  return {
    introText: content.introText,
    costText: content.costText,
    paymentText: content.paymentText,
    cancellationText: content.cancellationText,
    capacityText: content.capacityText,
    considerationsText: content.considerations.join('\n'),
  };
}

function buildEducationContinuaSchema(
  dateOptions: string[],
  purposeOptions: string[],
  educationContent: EducationContentForm,
) {
  return {
    fields: [
      {
        id: 'seminarDate',
        label: 'Fecha de seminario disponible',
        type: 'radio' as const,
        required: true,
        options: dateOptions,
      },
      {
        id: 'seminarPurpose',
        label: 'Usted tomara el seminario para',
        type: 'radio' as const,
        required: true,
        options: purposeOptions,
      },
    ],
    educationContent: {
      introText: educationContent.introText.trim() || SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT.introText,
      costText: educationContent.costText.trim() || SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT.costText,
      paymentText: educationContent.paymentText.trim() || SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT.paymentText,
      cancellationText:
        educationContent.cancellationText.trim() || SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT.cancellationText,
      capacityText: educationContent.capacityText.trim() || SEMINARIO_EDUCACION_CONTINUA_CONTENIDO_DEFAULT.capacityText,
      considerations: parseLines(educationContent.considerationsText),
    },
  };
}

function getSeminarRegistrationFormType(event?: EventoAcademico | null): EventoAcademico['registrationFormType'] {
  if (!event || event.eventType !== 'seminario') return 'seminario_general';
  if (event.registrationFormType === 'educacion_continua') return 'educacion_continua';
  if (isRegistroPermanenteEvento(event)) return 'educacion_continua';
  return 'seminario_general';
}

export function PaginaFormularioEvento() {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId } = useParams();
  const { profile } = useAutenticacion();
  const duplicateFrom = !eventId ? ((location.state as DuplicateEventState | null)?.duplicateFrom ?? null) : null;
  const [eventToEdit, setEventToEdit] = useState<EventoAcademico | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<EventoAcademico['eventType']>('congreso');
  const [selectedRegistrationFormType, setSelectedRegistrationFormType] =
    useState<EventoAcademico['registrationFormType']>('seminario_general');
  const [isPermanentSelected, setIsPermanentSelected] = useState(false);
  const [customFields, setCustomFields] = useState<CampoFormularioPersonalizado[]>([]);
  const [seminarDateOptionsText, setSeminarDateOptionsText] = useState(SEMINARIO_DATE_OPTIONS.join('\n'));
  const [seminarPurposeOptionsText, setSeminarPurposeOptionsText] = useState(SEMINARIO_PURPOSE_OPTIONS.join('\n'));
  const [educationContentForm, setEducationContentForm] = useState<EducationContentForm>(
    buildEducationContentForm(null),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(eventId);

  const initialValues = useMemo(
    () => ({
      title: eventToEdit?.title ?? getDuplicateEventTitle(duplicateFrom),
      eventType: eventToEdit?.eventType ?? duplicateFrom?.eventType ?? 'congreso',
      registrationFormType: getSeminarRegistrationFormType(eventToEdit ?? duplicateFrom),
      isPermanent: eventToEdit?.isPermanent ?? duplicateFrom?.isPermanent ?? false,
      location: eventToEdit?.location ?? duplicateFrom?.location ?? '',
      capacity: eventToEdit?.capacity ?? duplicateFrom?.capacity ?? '',
      startsAt: toDateTimeLocal(eventToEdit?.startsAt ?? duplicateFrom?.startsAt ?? null),
      endsAt: toDateTimeLocal(eventToEdit?.endsAt ?? duplicateFrom?.endsAt ?? null),
      status: getEditableStatus(eventToEdit?.status ?? duplicateFrom?.status ?? 'published'),
      description: eventToEdit?.description ?? duplicateFrom?.description ?? '',
      customFormSchema: eventToEdit?.customFormSchema ?? duplicateFrom?.customFormSchema ?? { fields: [] },
    }),
    [duplicateFrom, eventToEdit],
  );

  useEffect(() => {
    if (!eventId) return;

    void getEvent(eventId)
      .then((event) => {
        if (!event) {
          setError('Evento no encontrado');
          return;
        }
        setEventToEdit(event);
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar el evento')));
  }, [eventId]);

  useEffect(() => {
    setSelectedEventType(initialValues.eventType);
  }, [initialValues.eventType]);

  useEffect(() => {
    setSelectedRegistrationFormType(initialValues.registrationFormType);
    setIsPermanentSelected(initialValues.isPermanent);
    setCustomFields(initialValues.customFormSchema?.fields ?? []);
    const sourceEvent = eventToEdit ?? duplicateFrom;
    setSeminarDateOptionsText(getSchemaFieldOptions(sourceEvent, 'seminarDate', SEMINARIO_DATE_OPTIONS).join('\n'));
    setSeminarPurposeOptionsText(getSchemaFieldOptions(sourceEvent, 'seminarPurpose', SEMINARIO_PURPOSE_OPTIONS).join('\n'));
    setEducationContentForm(buildEducationContentForm(sourceEvent));
  }, [initialValues.customFormSchema, initialValues.registrationFormType, initialValues.isPermanent]);

  const isEducacionContinuaSelected =
    selectedEventType === 'seminario' && selectedRegistrationFormType === 'educacion_continua';
  const allowsOptionalCapacity = isPermanentSelected || isEducacionContinuaSelected;

  function getRequiredText(form: FormData, field: string, label: string) {
    const value = String(form.get(field) ?? '').trim();
    if (!value) throw new Error(`${label} es obligatorio`);
    return value;
  }

  function getOptionalDateTime(form: FormData, field: string) {
    const value = String(form.get(field) ?? '').trim();
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new Error('La fecha u hora ingresada no es valida');

    return parsed.toISOString();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      setError('Debes iniciar sesion para guardar eventos');
      return;
    }

    const form = new FormData(event.currentTarget);
    setError(null);
    setIsSaving(true);

    try {
      const eventType = String(form.get('eventType') ?? 'seminario') as EventoAcademico['eventType'];
      const registrationFormType =
        eventType === 'seminario'
          ? (String(form.get('registrationFormType') ?? 'seminario_general') as EventoAcademico['registrationFormType'])
          : null;
      const isPermanent = form.get('isPermanent') === 'on' || registrationFormType === 'educacion_continua';
      const capacityValue = String(form.get('capacity') ?? '').trim();
      const capacity =
        registrationFormType === 'educacion_continua'
          ? 9999
          : capacityValue
            ? Number(capacityValue)
            : isPermanent
              ? 9999
              : 0;
      if (!Number.isFinite(capacity) || capacity <= 0) throw new Error('La capacidad debe ser mayor que cero');

      const locationValue = String(form.get('location') ?? '').trim();
      const payload = {
        title: getRequiredText(form, 'title', 'El nombre del evento'),
        eventType,
        registrationFormType,
        isPermanent,
        description: String(form.get('description') ?? '').trim(),
        location: locationValue || (isPermanent ? 'Virtual' : getRequiredText(form, 'location', 'El lugar')),
        startsAt: getOptionalDateTime(form, 'startsAt'),
        endsAt: getOptionalDateTime(form, 'endsAt'),
        capacity,
        status: String(form.get('status') ?? 'published') as EventoAcademico['status'],
        customFormSchema:
          registrationFormType === 'educacion_continua'
            ? buildEducationContinuaSchema(
                parseOptions(seminarDateOptionsText),
                parseOptions(seminarPurposeOptionsText),
                educationContentForm,
              )
            : registrationFormType === 'personalizado'
              ? {
                  fields: customFields
                    .map((field) => ({
                      ...field,
                      label: field.label.trim(),
                      helpText: field.helpText?.trim() ?? '',
                      options: needsOptions(field.type) ? field.options?.map((option) => option.trim()).filter(Boolean) : [],
                    }))
                    .filter((field) => field.label.length > 0),
                }
              : null,
      };

      if (registrationFormType === 'personalizado' && payload.customFormSchema && payload.customFormSchema.fields.length === 0) {
        throw new Error('Agregue al menos un campo al formulario personalizado');
      }

      if (registrationFormType === 'educacion_continua') {
        if (parseOptions(seminarDateOptionsText).length === 0) {
          throw new Error('Agregue al menos una fecha disponible para Educacion Continua');
        }
        if (parseOptions(seminarPurposeOptionsText).length === 0) {
          throw new Error('Agregue al menos un motivo para Educacion Continua');
        }
        if (educationContentForm.considerationsText.trim() && parseLines(educationContentForm.considerationsText).length === 0) {
          throw new Error('Revise las consideraciones importantes del seminario');
        }
      }

      const invalidOptionsField = payload.customFormSchema?.fields.find(
        (field) => needsOptions(field.type) && (!field.options || field.options.length === 0),
      );
      if (invalidOptionsField) {
        throw new Error(`Agregue opciones para el campo "${invalidOptionsField.label}"`);
      }

      const savedEvent = isEditing && eventId
        ? await updateEvent({ id: eventId, ...payload })
        : await createEvent({
            ...payload,
            organizerId: profile.id,
            organizationId: profile.organizationId,
          });

      navigate(`/eventos/${savedEvent.id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el evento'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow="Gestion de eventos"
        title={isEditing ? 'Editar evento' : duplicateFrom ? 'Duplicar evento' : 'Nuevo evento'}
        description={
          isEditing
            ? 'Modifique los datos del evento seleccionado.'
            : duplicateFrom
              ? 'Revise la copia, ajuste lo necesario y guarde para generar un nuevo enlace publico independiente.'
              : 'Cree un evento academico para registro y control de asistencia.'
        }
      />
      <form className="panel form-grid" onSubmit={handleSubmit} noValidate>
        <label>
          Nombre del evento
          <input name="title" required placeholder="Ej. Congreso de Investigacion Aplicada" defaultValue={initialValues.title} />
        </label>
        <label>
          Tipo
          <select
            name="eventType"
            value={selectedEventType}
            required
            onChange={(event) => {
              const nextType = event.currentTarget.value as EventoAcademico['eventType'];
              setSelectedEventType(nextType);
              if (nextType !== 'seminario') {
                setSelectedRegistrationFormType(null);
                setIsPermanentSelected(false);
              } else if (!selectedRegistrationFormType) {
                setSelectedRegistrationFormType('seminario_general');
              }
            }}
          >
            <option value="seminario">Seminario</option>
            <option value="congreso">Congreso</option>
            <option value="taller">Taller</option>
            <option value="capacitacion">Capacitacion</option>
            <option value="universitario">Evento universitario</option>
          </select>
        </label>
        {selectedEventType === 'seminario' ? (
          <label>
            Formulario del seminario
            <select
              name="registrationFormType"
              value={selectedRegistrationFormType ?? 'seminario_general'}
              onChange={(event) => {
                const nextValue = event.currentTarget.value as EventoAcademico['registrationFormType'];
                setSelectedRegistrationFormType(nextValue);
                if (nextValue === 'educacion_continua') setIsPermanentSelected(true);
              }}
            >
              <option value="seminario_general">Seminario general UNACHI</option>
              <option value="educacion_continua">Educacion continua / Informatica intermedia</option>
            </select>
            <span className="field-hint">
              Educacion continua usa fechas, aula virtual y motivo. General UNACHI usa un formulario mas corto.
            </span>
          </label>
        ) : null}
        {isEducacionContinuaSelected ? (
          <section className="custom-form-builder full-field">
            <div>
              <span className="eyebrow">Educacion continua</span>
              <h2>Formulario editable de Informatica Intermedia</h2>
              <p className="form-hint">
                Todo esto se guarda con el evento y tambien se copia cuando duplique el seminario.
              </p>
            </div>
            <div className="form-grid compact-form-grid">
              <label className="full-field">
                Texto informativo superior
                <textarea
                  rows={4}
                  value={educationContentForm.introText}
                  onChange={(event) =>
                    setEducationContentForm((current) => ({ ...current, introText: event.currentTarget.value }))
                  }
                  placeholder="Explique horario, modalidad e instrucciones generales"
                />
              </label>
              <label>
                Costo
                <input
                  value={educationContentForm.costText}
                  onChange={(event) =>
                    setEducationContentForm((current) => ({ ...current, costText: event.currentTarget.value }))
                  }
                  placeholder="B/. 75.00 balboas"
                />
              </label>
              <label>
                Forma de pago
                <input
                  value={educationContentForm.paymentText}
                  onChange={(event) =>
                    setEducationContentForm((current) => ({ ...current, paymentText: event.currentTarget.value }))
                  }
                  placeholder="Recibira instrucciones al inscribirse"
                />
              </label>
              <label>
                Cancelacion
                <input
                  value={educationContentForm.cancellationText}
                  onChange={(event) =>
                    setEducationContentForm((current) => ({ ...current, cancellationText: event.currentTarget.value }))
                  }
                  placeholder="Debe cancelar antes de iniciar clases"
                />
              </label>
              <label>
                Cupo por fecha
                <input
                  value={educationContentForm.capacityText}
                  onChange={(event) =>
                    setEducationContentForm((current) => ({ ...current, capacityText: event.currentTarget.value }))
                  }
                  placeholder="hasta 25 participantes por cada fecha disponible"
                />
              </label>
              <label>
                Fechas disponibles
                <textarea
                  rows={7}
                  value={seminarDateOptionsText}
                  onChange={(event) => setSeminarDateOptionsText(event.currentTarget.value)}
                  placeholder="Del 10 al 14 de Agosto"
                />
              </label>
              <label>
                Motivos del seminario
                <textarea
                  rows={7}
                  value={seminarPurposeOptionsText}
                  onChange={(event) => setSeminarPurposeOptionsText(event.currentTarget.value)}
                  placeholder="Requisito de ingreso a posgrado y maestria"
                />
              </label>
              <label className="full-field">
                Consideraciones importantes
                <textarea
                  rows={4}
                  value={educationContentForm.considerationsText}
                  onChange={(event) =>
                    setEducationContentForm((current) => ({
                      ...current,
                      considerationsText: event.currentTarget.value,
                    }))
                  }
                  placeholder={'No pagar en las cajas de UNACHI\nEspere instrucciones de pago'}
                />
              </label>
            </div>
          </section>
        ) : null}
        <label>
          {allowsOptionalCapacity ? 'Lugar opcional' : 'Lugar'}
          <input
            name="location"
            required={!allowsOptionalCapacity}
            placeholder={allowsOptionalCapacity ? 'Virtual' : 'Auditorio, salon o campus'}
            defaultValue={initialValues.location}
          />
        </label>
        {selectedEventType === 'seminario' && selectedRegistrationFormType === 'personalizado' ? (
          <section className="custom-form-builder full-field">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Editor de formulario</span>
                <h2>Campos personalizados</h2>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setCustomFields((currentFields) => [...currentFields, createCustomField()])}
              >
                <Plus size={18} />
                Agregar campo
              </button>
            </div>
            {customFields.length === 0 ? (
              <p className="form-hint">Agregue campos para crear un formulario tipo Microsoft Forms.</p>
            ) : null}
            <div className="custom-form-fields">
              {customFields.map((field, index) => (
                <article className="custom-form-field-card" key={field.id}>
                  <div className="custom-form-field-header">
                    <strong>Campo {index + 1}</strong>
                    <button
                      className="icon-button danger-button"
                      type="button"
                      aria-label="Eliminar campo"
                      onClick={() => setCustomFields((currentFields) => currentFields.filter((item) => item.id !== field.id))}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <div className="form-grid compact-form-grid">
                    <label>
                      Titulo del campo
                      <input
                        value={field.label}
                        placeholder="Ej. Facultad, telefono, modalidad..."
                        onChange={(changeEvent) =>
                          setCustomFields((currentFields) =>
                            currentFields.map((item) =>
                              item.id === field.id ? { ...item, label: changeEvent.currentTarget.value } : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Tipo de respuesta
                      <select
                        value={field.type}
                        onChange={(changeEvent) =>
                          setCustomFields((currentFields) =>
                            currentFields.map((item) =>
                              item.id === field.id
                                ? {
                                    ...item,
                                    type: changeEvent.currentTarget.value as TipoCampoFormularioPersonalizado,
                                    options: needsOptions(changeEvent.currentTarget.value as TipoCampoFormularioPersonalizado)
                                      ? item.options
                                      : [],
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        {customFieldTypeOptions.map((option) => (
                          <option value={option.value} key={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(changeEvent) =>
                          setCustomFields((currentFields) =>
                            currentFields.map((item) =>
                              item.id === field.id ? { ...item, required: changeEvent.currentTarget.checked } : item,
                            ),
                          )
                        }
                      />
                      <span>Campo obligatorio</span>
                    </label>
                    <label>
                      Ayuda opcional
                      <input
                        value={field.helpText ?? ''}
                        placeholder="Texto breve para orientar al participante"
                        onChange={(changeEvent) =>
                          setCustomFields((currentFields) =>
                            currentFields.map((item) =>
                              item.id === field.id ? { ...item, helpText: changeEvent.currentTarget.value } : item,
                            ),
                          )
                        }
                      />
                    </label>
                    {needsOptions(field.type) ? (
                      <label className="full-field">
                        Opciones, una por linea
                        <textarea
                          rows={4}
                          value={(field.options ?? []).join('\n')}
                          placeholder={'Opcion 1\nOpcion 2\nOpcion 3'}
                          onChange={(changeEvent) =>
                            setCustomFields((currentFields) =>
                              currentFields.map((item) =>
                                item.id === field.id
                                  ? { ...item, options: parseOptions(changeEvent.currentTarget.value) }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        <label>
          {allowsOptionalCapacity ? 'Capacidad opcional' : 'Capacidad'}
          <input
            name="capacity"
            required={!allowsOptionalCapacity}
            min="1"
            type="number"
            placeholder={allowsOptionalCapacity ? 'Sin limite' : '120'}
            defaultValue={allowsOptionalCapacity || initialValues.capacity === 9999 ? '' : initialValues.capacity}
          />
          {allowsOptionalCapacity ? (
            <span className="field-hint">
              Para Educacion Continua el cupo se controla por fecha disponible. Puede dejar este campo vacio.
            </span>
          ) : null}
        </label>
        <label>
          Inicio opcional
          <input name="startsAt" type="datetime-local" step="60" defaultValue={initialValues.startsAt} />
        </label>
        <label>
          Fin opcional
          <input name="endsAt" type="datetime-local" step="60" defaultValue={initialValues.endsAt} />
        </label>
        <label className="checkbox-field">
          <input
            name="isPermanent"
            type="checkbox"
            checked={allowsOptionalCapacity}
            disabled={isEducacionContinuaSelected}
            onChange={(event) => setIsPermanentSelected(event.currentTarget.checked)}
          />
          <span>
            Registro permanente
            <small>
              Mantiene el enlace publico disponible todo el año y evita que el evento cierre automaticamente por fecha.
            </small>
          </span>
        </label>
        <label>
          Publicacion del evento
          <select name="status" defaultValue={initialValues.status} required key={`status-${initialValues.status}`}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado / visible</option>
            <option value="archived">Archivado</option>
          </select>
          <span className="field-hint">
            Activo y Finalizado son estados automaticos. El sistema los calcula segun la fecha de inicio y fin.
          </span>
        </label>
        <label className="full-field">
          Descripcion
          <textarea
            name="description"
            rows={5}
            placeholder="Resumen academico, objetivos y publico esperado"
            defaultValue={initialValues.description}
          />
        </label>
        {error ? <p className="form-error full-field">{error}</p> : null}
        <button className="primary-button full-field" type="submit" disabled={isSaving}>
          <Save size={18} />
          {isSaving ? 'Guardando...' : isEditing ? 'Actualizar evento' : 'Guardar evento'}
        </button>
      </form>
    </div>
  );
}
