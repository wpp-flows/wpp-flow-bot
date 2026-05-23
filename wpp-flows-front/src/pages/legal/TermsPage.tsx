import { APP_CONFIG } from '@/constants/app';
import { LegalLayout } from './LegalLayout';

export function TermsPage() {
  return (
    <LegalLayout title="Termos de Uso" updatedAt="22 de maio de 2026">
      <p>
        Estes Termos regulam o uso da plataforma {APP_CONFIG.name}, que permite
        a restaurantes criar e operar chatbots no WhatsApp para receber pedidos
        e atender clientes. Ao criar uma conta ou utilizar o serviço, você
        declara ter lido e aceito as condições abaixo.
      </p>

      <h2>1. Aceitação</h2>
      <p>
        Estes Termos formam um contrato entre o restaurante que opera o serviço
        ("Operador") e o {APP_CONFIG.name}. Se você não concorda com algum
        ponto, não utilize a plataforma.
      </p>

      <h2>2. Quem pode usar</h2>
      <p>
        O serviço é destinado a pessoas físicas ou jurídicas maiores de 18 anos
        que operem estabelecimentos comerciais (restaurantes, lanchonetes,
        pizzarias, etc.) no Brasil. Você se responsabiliza pelas informações
        fornecidas no cadastro.
      </p>

      <h2>3. O que oferecemos</h2>
      <ul>
        <li>
          Criação e gestão de chatbots conectados ao WhatsApp Business via API
          oficial.
        </li>
        <li>
          Construtor visual de fluxos de conversa (mensagens, menus, perguntas,
          confirmação e pagamento).
        </li>
        <li>
          Cardápio digital com categorias, itens, disponibilidade por dia da
          semana e combos promocionais.
        </li>
        <li>
          Integração com Mercado Pago para receber pagamentos via Checkout Pro.
        </li>
        <li>
          Painel de pedidos, conversas, métricas e notificações em tempo real.
        </li>
      </ul>

      <h2>4. Responsabilidades do Operador</h2>
      <ul>
        <li>
          Manter a confidencialidade do login e senha. Você é responsável por
          toda atividade realizada na sua conta.
        </li>
        <li>
          Garantir que o conteúdo enviado aos clientes (cardápios, preços,
          imagens, mensagens) seja preciso, lícito e não infrinja direitos de
          terceiros.
        </li>
        <li>
          Cumprir as Políticas Comerciais e de Comércio do WhatsApp Business e
          as diretrizes da Meta. Em especial: não usar o bot para spam, fraudes,
          venda de produtos proibidos pela Meta ou conteúdo ilegal.
        </li>
        <li>
          Emitir os documentos fiscais devidos aos clientes finais. O{' '}
          {APP_CONFIG.name} é uma ferramenta operacional e não atua como
          intermediário fiscal.
        </li>
        <li>
          Manter credenciais do Mercado Pago atualizadas para que pagamentos
          fluam corretamente. Disputas, reembolsos e cashback são tratados
          diretamente entre o Operador, o cliente e o Mercado Pago.
        </li>
      </ul>

      <h2>5. Conduta proibida</h2>
      <p>É vedado, por exemplo:</p>
      <ul>
        <li>Disparar mensagens não solicitadas em massa pelo WhatsApp.</li>
        <li>Tentar acessar contas ou dados de outros operadores.</li>
        <li>
          Fazer engenharia reversa, descompilar ou tentar burlar limites de uso
          da plataforma.
        </li>
        <li>
          Usar o serviço para vender produtos proibidos por lei ou pelas
          políticas da Meta (armas, drogas ilícitas, conteúdo adulto, etc.).
        </li>
      </ul>
      <p>
        O descumprimento pode resultar em suspensão imediata da conta, sem
        prejuízo das responsabilidades legais.
      </p>

      <h2>6. Pagamentos e cobranças</h2>
      <p>
        Os valores pagos pelos clientes finais são creditados diretamente na
        conta Mercado Pago do Operador. O {APP_CONFIG.name} pode cobrar
        mensalidade ou comissão pelo uso da plataforma — quando aplicável, as
        condições comerciais são acordadas separadamente e podem ser alteradas
        com aviso prévio de 30 dias.
      </p>

      <h2>7. Disponibilidade do serviço</h2>
      <p>
        Trabalhamos para manter o serviço disponível 24/7, mas não garantimos
        uptime absoluto. Indisponibilidades por manutenção, instabilidade do
        WhatsApp, Mercado Pago, infraestrutura de hospedagem ou eventos de
        força maior estão fora do nosso controle direto.
      </p>

      <h2>8. Propriedade intelectual</h2>
      <p>
        A plataforma, sua marca, código, design e documentação são de
        titularidade do {APP_CONFIG.name}. O Operador mantém a propriedade do
        conteúdo que cria dentro da plataforma (cardápios, fluxos, mensagens) e
        nos concede uma licença limitada para hospedar e exibir esse conteúdo
        durante a vigência do contrato.
      </p>

      <h2>9. Limitação de responsabilidade</h2>
      <p>
        O {APP_CONFIG.name} fornece a ferramenta tecnológica. O Operador é
        responsável pelas vendas que realiza, pela qualidade dos produtos
        entregues, pelo atendimento ao cliente e pelo cumprimento das normas
        sanitárias, fiscais e trabalhistas do seu negócio. Em nenhuma hipótese
        responderemos por lucros cessantes, danos indiretos ou consequenciais
        decorrentes do uso do serviço.
      </p>

      <h2>10. Encerramento</h2>
      <p>
        O Operador pode encerrar a conta a qualquer momento solicitando à{' '}
        <a href={`mailto:${APP_CONFIG.supportEmail}`}>
          {APP_CONFIG.supportEmail}
        </a>
        . O {APP_CONFIG.name} pode suspender ou encerrar contas que descumprirem
        estes Termos ou as políticas do WhatsApp/Meta. Após o encerramento, os
        dados podem ser removidos conforme descrito na{' '}
        <a href="/privacidade">Política de Privacidade</a>.
      </p>

      <h2>11. Mudanças nestes Termos</h2>
      <p>
        Podemos atualizar estes Termos para refletir mudanças no serviço ou na
        legislação. Atualizações relevantes serão comunicadas no painel ou por
        e-mail. O uso continuado da plataforma após a publicação implica em
        concordância com a nova versão.
      </p>

      <h2>12. Lei aplicável e foro</h2>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil.
        Fica eleito o foro da comarca onde fica a sede do operador da
        plataforma para dirimir quaisquer controvérsias, com renúncia a
        qualquer outro, por mais privilegiado que seja.
      </p>

      <h2>13. Contato</h2>
      <p>
        Dúvidas sobre estes Termos? Escreva para{' '}
        <a href={`mailto:${APP_CONFIG.supportEmail}`}>
          {APP_CONFIG.supportEmail}
        </a>
        .
      </p>
    </LegalLayout>
  );
}
