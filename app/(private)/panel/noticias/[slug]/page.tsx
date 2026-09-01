import { notFound, permanentRedirect } from "next/navigation";
import { NewsForm } from "@/components/admin/news-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { getNewsItemBySlug } from "@/lib/content/news";
import { updateNewsItemAction } from "@/app/(private)/panel/noticias/actions";

type PanelEditarNoticiaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PanelEditarNoticiaPage({
  params
}: PanelEditarNoticiaPageProps) {
  const { slug } = await params;
  const newsItem = await getNewsItemBySlug(slug);

  if (!newsItem) {
    notFound();
  }

  if (slug !== newsItem.slug) {
    permanentRedirect(`/panel/noticias/${newsItem.slug}`);
  }

  return (
    <AdminShell
      title="Editar Noticia Oncologica"
      subtitle="Revision real de borradores detectados o generados por IA, con metadatos clinicos y control editorial."
    >
      <NewsForm
        title={newsItem.title}
        description="Edita el borrador, ajusta el tono y decide su estado editorial. Los cambios quedan persistidos en Prisma."
        action={updateNewsItemAction.bind(null, slug)}
        submitLabel="Guardar cambios"
        initialValues={newsItem}
        enableAiActions
      />
    </AdminShell>
  );
}
