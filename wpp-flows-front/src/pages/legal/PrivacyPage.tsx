import { APP_CONFIG } from '@/constants/app';
import { LegalLayout } from './LegalLayout';

export function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidade" updatedAt="22 de maio de 2026">
      <p>
        Esta Política de Privacidade descreve como a plataforma {APP_CONFIG.name}{' '}
        coleta, usa e protege as informações dos restaurantes e dos clientes
        atendidos pelos chatbots conectados ao WhatsApp. Ao utilizar o serviço,
        você concorda com as práticas descritas abaixo.
      </p>

      <h2>1. Quem somos</h2>
      <p>
        {APP_CONFIG.name} é uma plataforma que permite a restaurantes criar e
        operar chatbots no WhatsApp para receber pedidos, atender clientes e
        organizar a operação. O serviço opera no Brasil e está sujeito à Lei
        Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2>2. Quais dados coletamos</h2>
      <h3>2.1 Dados do operador (restaurante)</h3>
      <ul>
        <li>Nome, e-mail e senha do usuário responsável pelo painel.</li>
        <li>
          Nome, slug e dados operacionais da organização (chave PIX, credenciais
          do Mercado Pago, preferências de notificação).
        </li>
        <li>
          Configurações de bots, fluxos de conversa, cardápios e promoções.
        </li>
      </ul>

      <h3>2.2 Dados dos clientes finais</h3>
      <ul>
        <li>
          Nome de exibição público no WhatsApp e número de telefone — fornecidos
          pelo próprio cliente quando inicia uma conversa com o bot.
        </li>
        <li>
          Conteúdo das mensagens trocadas com o bot, necessário para registrar
          pedidos e dar continuidade ao atendimento.
        </li>
        <li>
          Endereço de entrega, observações e demais respostas digitadas durante
          o pedido (quando aplicável).
        </li>
        <li>
          Histórico de pedidos e status de pagamento associados ao número do
          cliente.
        </li>
      </ul>

      <h3>2.3 Dados de pagamento</h3>
      <p>
        Pagamentos são processados exclusivamente pelo Mercado Pago. A plataforma
        não armazena dados de cartão de crédito, débito ou senha bancária dos
        clientes. Recebemos apenas confirmações de pagamento (aprovação,
        rejeição ou estorno) e o identificador da transação.
      </p>

      <h2>3. Para que usamos esses dados</h2>
      <ul>
        <li>Operar o chatbot, registrar pedidos e enviar respostas ao cliente.</li>
        <li>
          Permitir que o restaurante acompanhe pedidos, conversas, pagamentos e
          métricas no painel.
        </li>
        <li>
          Enviar notificações ao operador (novo pedido, pagamento recebido,
          mudanças de status).
        </li>
        <li>
          Avisar o cliente sobre o andamento do pedido (preparo, saída para
          entrega, entrega ou cancelamento).
        </li>
        <li>Cumprir obrigações legais e fiscais quando aplicável.</li>
      </ul>

      <h2>4. Com quem compartilhamos</h2>
      <ul>
        <li>
          <strong>Meta / WhatsApp:</strong> as mensagens trafegam pela
          infraestrutura oficial do WhatsApp Business, conforme as políticas da
          Meta. A plataforma se conecta via API oficial.
        </li>
        <li>
          <strong>Mercado Pago:</strong> para processar pagamentos quando o
          restaurante optar por essa funcionalidade.
        </li>
        <li>
          <strong>Provedores de infraestrutura:</strong> banco de dados
          (Supabase / PostgreSQL), Redis para cache e filas, e o host de
          aplicação. Esses provedores acessam dados apenas para operar o
          serviço, sob acordos contratuais de confidencialidade.
        </li>
      </ul>
      <p>
        Não vendemos nem compartilhamos dados para fins de marketing de
        terceiros.
      </p>

      <h2>5. Retenção</h2>
      <p>
        Mensagens, pedidos e dados de clientes ficam armazenados enquanto a
        conta do restaurante estiver ativa. Notificações lidas são removidas
        automaticamente após 24 horas. O restaurante pode solicitar a exclusão
        total dos dados de sua organização escrevendo para{' '}
        <a href={`mailto:${APP_CONFIG.supportEmail}`}>
          {APP_CONFIG.supportEmail}
        </a>
        ; a remoção é executada em até 30 dias, exceto quando houver obrigação
        legal de retenção (fiscal, regulatória).
      </p>

      <h2>6. Direitos do titular dos dados</h2>
      <p>
        Em conformidade com a LGPD, o cliente final tem direito a:
      </p>
      <ul>
        <li>Confirmar a existência de tratamento dos seus dados.</li>
        <li>Acessar e corrigir os dados.</li>
        <li>Solicitar a anonimização, bloqueio ou eliminação.</li>
        <li>Solicitar a portabilidade.</li>
        <li>Revogar o consentimento.</li>
      </ul>
      <p>
        Solicitações devem ser enviadas para{' '}
        <a href={`mailto:${APP_CONFIG.supportEmail}`}>
          {APP_CONFIG.supportEmail}
        </a>{' '}
        e serão respondidas em até 15 dias úteis.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Aplicamos práticas razoáveis de segurança: tráfego em HTTPS, senhas
        armazenadas com hash criptográfico, isolamento por organização no banco
        de dados e tokens de sessão com expiração. Apesar disso, nenhum sistema
        é absolutamente seguro — quando identificarmos incidentes que afetem
        dados pessoais, comunicaremos os afetados em prazo razoável.
      </p>

      <h2>8. Cookies e armazenamento local</h2>
      <p>
        O painel utiliza cookies de sessão para manter o operador autenticado e
        armazena preferências básicas (tema claro/escuro) no navegador. Não há
        rastreamento publicitário.
      </p>

      <h2>9. Crianças</h2>
      <p>
        O serviço é destinado a operações comerciais e não é direcionado a
        menores de 18 anos. Não coletamos intencionalmente dados de crianças.
      </p>

      <h2>10. Alterações nesta política</h2>
      <p>
        Esta política pode ser atualizada para refletir mudanças no serviço ou
        na legislação. A data de "última atualização" no topo desta página
        sempre indica a versão vigente.
      </p>

      <h2>11. Contato</h2>
      <p>
        Para qualquer dúvida sobre privacidade ou solicitação relacionada a
        dados pessoais, escreva para{' '}
        <a href={`mailto:${APP_CONFIG.supportEmail}`}>
          {APP_CONFIG.supportEmail}
        </a>
        .
      </p>
    </LegalLayout>
  );
}
