import React from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

import { useGameContext } from '../context';

const useStyles = makeStyles({
  surface: {
    maxWidth: 'min(640px, 94vw)',
    width: 'min(640px, 94vw)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  list: {
    margin: 0,
    paddingInlineStart: '1.5em',
  },
});

interface IRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** In-app summary of the blackjack rules implemented by the game. */
export const RulesDialog: React.FC<IRulesDialogProps> = ({ open, onOpenChange }) => {
  const styles = useStyles();
  const { gameState } = useGameContext();
  const minimumBet = gameState.minimumBet;

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>Blackjack rules</DialogTitle>
          <DialogContent className={styles.content}>
            <section className={styles.section} aria-labelledby="rules-objective">
              <Text as="h3" id="rules-objective" weight="semibold">Goal and card values</Text>
              <Text as="p">Finish closer to 21 than the dealer without going over. Number cards count as shown, face cards count as 10, and an ace counts as 1 or 11, whichever gives the higher total without busting.</Text>
            </section>

            <section className={styles.section} aria-labelledby="rules-wagers">
              <Text as="h3" id="rules-wagers" weight="semibold">Antes and wagers</Text>
              <Text as="p">At the start of each round, both players ante the minimum bet of ${minimumBet}. Before dealing or during your turn, use Wager to add another ${minimumBet} to your stake and the pot. You can wager more than once, up to the money in your bank.</Text>
            </section>

            <section className={styles.section} aria-labelledby="rules-turn">
              <Text as="h3" id="rules-turn" weight="semibold">Your turn</Text>
              <ul className={styles.list}>
                <li>Hit to draw a card, or Stay to end your turn.</li>
                <li>Double Down is available on your turn with exactly two cards when your bank can cover your current stake. It adds an equal amount, draws one card, and then stands unless you bust.</li>
                <li>A total over 21 busts and loses the round.</li>
              </ul>
            </section>

            <section className={styles.section} aria-labelledby="rules-dealer">
              <Text as="h3" id="rules-dealer" weight="semibold">Dealer and results</Text>
              <Text as="p">The dealer draws below 17 and stands on 17 or higher. After you stay, the higher total wins; equal totals push. A two-card 21 is a natural blackjack and settles immediately. If both players have a natural, the round pushes.</Text>
              <Text as="p">A winner takes the pot. A human natural blackjack also receives a bonus equal to half the human's total stake, paid from the dealer's bank. On a push, each player gets their own stake back.</Text>
            </section>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
