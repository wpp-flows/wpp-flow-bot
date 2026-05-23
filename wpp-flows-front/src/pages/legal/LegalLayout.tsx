import { Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_CONFIG, ROUTES } from '@/constants/app';

interface Props {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, updatedAt, children }: Readonly<Props>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              {APP_CONFIG.name}
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-xs">
            <Link
              to={ROUTES.privacy}
              className="text-muted-foreground hover:text-foreground"
            >
              Privacidade
            </Link>
            <Link
              to={ROUTES.terms}
              className="text-muted-foreground hover:text-foreground"
            >
              Termos
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última atualização: {updatedAt}
          </p>
        </div>
        <article className="prose prose-sm max-w-none space-y-5 text-sm leading-relaxed text-foreground/90 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:text-primary [&_a:hover]:underline">
          {children}
        </article>
      </main>

      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-6 text-2xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} {APP_CONFIG.name}. Em caso de dúvidas,
          escreva para{' '}
          <a
            className="text-primary hover:underline"
            href={`mailto:${APP_CONFIG.supportEmail}`}
          >
            {APP_CONFIG.supportEmail}
          </a>
          .
        </div>
      </footer>
    </div>
  );
}
