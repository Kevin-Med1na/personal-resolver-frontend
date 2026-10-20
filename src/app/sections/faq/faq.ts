import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SERVICE_END_HOUR, SERVICE_OFFSET_LABEL, SERVICE_START_HOUR } from '../../service-hours';

interface Question {
  question: string;
  answer: string;
  /** Enlace interno opcional al final de la respuesta. */
  link?: { label: string; path: string };
}

/**
 * Preguntas frecuentes. Cada respuesta describe lo que hace el código; no
 * nombra las fuentes, que solo aparecen en el pie de página.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-faq',
  styleUrl: './faq.css',
  templateUrl: './faq.html',
})
export class Faq {
  readonly issuesUrl = 'https://github.com/Kevin-Med1na/personal-resolver-frontend/issues';

  readonly questions: Question[] = [
    {
      question: '¿Qué datos muestra una consulta?',
      answer: 'Con una cédula: nombre completo, género, edad, y el departamento y el municipio de '
        + 'residencia registrados. Con un NIT: razón social, tipo de empresa, estado y ciudad. En los '
        + 'dos casos verás también cuántas veces se ha consultado el documento con la misma '
        + 'información y la fecha de la consulta anterior.',
    },
    {
      question: '¿Por qué el servicio tiene horario?',
      answer: `Funciona de ${SERVICE_START_HOUR}:00 a ${SERVICE_END_HOUR}:00 (${SERVICE_OFFSET_LABEL}). `
        + 'Fuera de ese horario el servidor que hace las consultas puede estar apagado. El estado que '
        + 'ves arriba se comprueba con el servidor mientras la página está abierta, así que indica si '
        + 'se puede consultar en ese momento.',
    },
    {
      question: '¿Por qué algunas consultas tardan más?',
      answer: 'Las consultas de cédula necesitan abrir primero una sesión con el registro, y eso puede '
        + 'tomar varios segundos. Mientras esa sesión siga activa, las siguientes consultas suelen ser '
        + 'más rápidas.',
    },
    {
      question: '¿Qué significa «Sin resultados»?',
      answer: 'Que el registro no devolvió información para ese número. Comprueba que esté completo y '
        + 'que hayas elegido el tipo de documento correcto: cédula para personas, NIT para empresas.',
    },
    {
      question: '¿Se guardan las consultas?',
      answer: 'Sí. Se guardan el documento consultado, la respuesta obtenida y la fecha; así el '
        + 'resultado puede indicar cuántas veces se ha consultado y cuándo. No se pide cuenta ni ningún '
        + 'dato de quien consulta. Si es tu documento, puedes pedir que se borren sus datos y que no '
        + 'vuelva a consultarse aquí.',
      link: { label: 'Cómo pedirlo', path: '/privacidad' },
    },
    {
      question: '¿Hay un límite de consultas?',
      answer: 'Sí. Para evitar consultas masivas, cada persona puede hacer un número limitado de '
        + 'consultas por minuto y por día. Si lo superas, el servicio te dirá cuánto esperar.',
    },
    {
      question: '¿Es un servicio oficial?',
      answer: 'No. Personal Resolver es un proyecto independiente y no está vinculado a las entidades '
        + 'que administran los registros. El código del frontend y del backend es público en GitHub.',
    },
  ];
}
