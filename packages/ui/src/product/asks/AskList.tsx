import { useState } from 'react';
import { AskCard } from './AskCard';
import { useProductPorts } from '../ports';
import { answeringBlock } from '../lib/asks';
import type { AnswerAskRequest, Ask } from '../lib/api/types';

/**
 * A column of answerable asks, wherever they are being shown.
 */
export function AskList({ asks, here }: { asks: Ask[]; here?: 'agent' | 'host' }) {
  const { useAccount, useAnswerAsk, useAskBoard, useAuth, useHosts } = useProductPorts();
  const { accountID, accounts } = useAuth();
  if (accountID === null) throw new Error('AskList requires an active account');
  const { board, recordAnswer } = useAskBoard();
  const hosts = useHosts(accountID);
  const account = useAccount(accountID);
  const answer = useAnswerAsk(accountID);
  const [answering, setAnswering] = useState<string | null>(null);
  const block = answeringBlock(
    account.data,
    accounts.find(membership => membership.id === accountID)?.role,
  );

  const send = (askID: string, body: AnswerAskRequest) => {
    setAnswering(askID);
    answer.mutate(
      { askID, body },
      {
        onSuccess: response => {
          recordAnswer(response);
          setAnswering(null);
        },
      },
    );
  };

  return (
    <>
      {asks.map(ask => (
        <AskCard
          key={ask.ask_id}
          ask={ask}
          outcome={board.outcomes[ask.ask_id]}
          instances={hosts.data}
          onAnswer={body => send(ask.ask_id, body)}
          pending={answer.isPending && answering === ask.ask_id}
          error={answering === ask.ask_id ? answer.error : undefined}
          here={here}
          block={block}
        />
      ))}
    </>
  );
}
