import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import Translate, { translate } from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import styles from './index.module.css';

type Section = {
  to: string;
  title: ReactNode;
  description: ReactNode;
};

// Each card opens an area of the book, in reading order: from what Vinnot is to how it is built.
// The routes follow docs/<locale>.
const sections: Section[] = [
  {
    to: '/docs',
    title: <Translate id="home.section.intro.title">Conocé Vinnot</Translate>,
    description: (
      <Translate id="home.section.intro.description">
        Qué es Vinnot, qué se puede hacer, quién lo usa y cómo está hecho.
      </Translate>
    ),
  },
  {
    to: '/docs/project',
    title: <Translate id="home.section.project.title">Proyecto</Translate>,
    description: (
      <Translate id="home.section.project.description">
        Objetivos, alcance, entregables, accesos y organización del repositorio.
      </Translate>
    ),
  },
  {
    to: '/docs/manuals',
    title: <Translate id="home.section.manuals.title">Manuales</Translate>,
    description: (
      <Translate id="home.section.manuals.description">
        Cómo se usa Vinnot en la web y en la app, por rol.
      </Translate>
    ),
  },
  {
    to: '/docs/modules',
    title: <Translate id="home.section.modules.title">Módulos</Translate>,
    description: (
      <Translate id="home.section.modules.description">
        Cada parte del producto: casos de uso, requisitos, arquitectura y pruebas.
      </Translate>
    ),
  },
  {
    to: '/docs/business',
    title: <Translate id="home.section.business.title">Modelo de negocio</Translate>,
    description: (
      <Translate id="home.section.business.description">
        Propuesta de valor, competencia, FODA, monetización, costos y escala.
      </Translate>
    ),
  },
  {
    to: '/docs/architecture',
    title: <Translate id="home.section.architecture.title">Arquitectura</Translate>,
    description: (
      <Translate id="home.section.architecture.description">
        Cómo se conectan las partes y qué tecnologías se usan.
      </Translate>
    ),
  },
  {
    to: '/docs/backend',
    title: <Translate id="home.section.backend.title">Backend</Translate>,
    description: (
      <Translate id="home.section.backend.description">
        API Spring Boot hexagonal: módulos, datos, diagramas y pruebas.
      </Translate>
    ),
  },
  {
    to: '/docs/frontend-web',
    title: <Translate id="home.section.web.title">Web</Translate>,
    description: (
      <Translate id="home.section.web.description">
        Frontend React: navegación, estado, flujos y diagramas.
      </Translate>
    ),
  },
  {
    to: '/docs/frontend-mobile',
    title: <Translate id="home.section.mobile.title">App móvil</Translate>,
    description: (
      <Translate id="home.section.mobile.description">
        App Expo / React Native: convenciones, flujos, escaneo y pruebas.
      </Translate>
    ),
  },
  {
    to: '/docs/infra',
    title: <Translate id="home.section.infra.title">Infraestructura</Translate>,
    description: (
      <Translate id="home.section.infra.description">
        Despliegue en AWS, operación, CI/CD y entornos.
      </Translate>
    ),
  },
  {
    to: '/docs/security',
    title: <Translate id="home.section.security.title">Seguridad</Translate>,
    description: (
      <Translate id="home.section.security.description">
        Contraseñas, autenticación, defensas por capa, servicios externos y límites conocidos.
      </Translate>
    ),
  },
  {
    to: '/docs/quality',
    title: <Translate id="home.section.quality.title">Calidad de software</Translate>,
    description: (
      <Translate id="home.section.quality.description">
        Modelo ISO 25010, requisitos no funcionales, métricas, riesgos y plan de pruebas.
      </Translate>
    ),
  },
  {
    to: '/docs/governance',
    title: <Translate id="home.section.governance.title">Gobierno</Translate>,
    description: (
      <Translate id="home.section.governance.description">
        Estándares de documentación, flujo de trabajo y este sitio.
      </Translate>
    ),
  },
];

export default function Home(): ReactNode {
  return (
    <Layout
      title={translate({ id: 'home.meta.title', message: 'Documentación' })}
      description={translate({
        id: 'home.meta.description',
        message: 'Documentación técnica y funcional de Vinnot, verificada contra el código.',
      })}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <img className={styles.mark} src={useBaseUrl('/img/mark.png')} alt="" />
          <div>
            <p className={styles.eyebrow}>Vinnot</p>
            <h1 className={styles.title}>
              <Translate id="home.hero.title">Documentación de Vinnot</Translate>
            </h1>
            <p className={styles.subtitle}>
              <Translate id="home.hero.subtitle">
                Qué es Vinnot, cómo se usa y cómo está construido, verificado contra el código.
              </Translate>
            </p>
            <Link className="button button--primary button--lg" to="/docs">
              <Translate id="home.hero.cta">Empezar a leer</Translate>
            </Link>
          </div>
        </div>
      </header>
      <main className={styles.sections}>
        {sections.map(section => (
          <Link key={section.to} className={styles.card} to={section.to}>
            <h2 className={styles.cardTitle}>{section.title}</h2>
            <p className={styles.cardText}>{section.description}</p>
          </Link>
        ))}
      </main>
    </Layout>
  );
}
