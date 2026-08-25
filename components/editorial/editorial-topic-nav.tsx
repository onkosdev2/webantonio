import {
  BookOpenText,
  Compass,
  Leaf,
  NewspaperClipping,
  Stethoscope
} from "@phosphor-icons/react/dist/ssr";
import styles from "./editorial-topic-nav.module.css";

const topics = [
  { href: "/casos-clinicos", label: "Casos", icon: Stethoscope },
  { href: "/noticias", label: "Actualidad", icon: NewspaperClipping },
  { href: "/investigacion", label: "Evidencia", icon: BookOpenText },
  { href: "/reflexiones", label: "Reflexiones", icon: Leaf },
  { href: "/orientacion-oncologica-remota", label: "Orientación", icon: Compass }
] as const;

export function EditorialTopicNav({ activeHref }: { activeHref?: string }) {
  return (
    <nav className={styles.nav} aria-label="Explorar secciones editoriales">
      {topics.map(({ href, label, icon: Icon }) => (
        <a
          key={href}
          href={href}
          aria-current={activeHref === href ? "page" : undefined}
        >
          <Icon size={17} weight="regular" aria-hidden="true" />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
