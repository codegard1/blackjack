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

import { MAX_OPPONENTS, NAME_CREDIT } from '../characters';
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
              <Text as="p">At the start of each round, every player antes the minimum bet of ${minimumBet}; the dealer does not. Before dealing or during your turn, use Wager to add another ${minimumBet} to your stake and the pot. You can wager more than once, up to the money in your bank. Computer players wager according to their temperament, and one who cannot cover the ante sits the round out.</Text>
            </section>

            <section className={styles.section} aria-labelledby="rules-turn">
              <Text as="h3" id="rules-turn" weight="semibold">Your turn</Text>
              <ul className={styles.list}>
                <li>Hit to draw a card, or Stay to end your turn.</li>
                <li>Double Down is available on your turn with exactly two cards when your bank can cover your current stake. It adds an equal amount, draws one card, and then stands unless you bust.</li>
                <li>A total over 21 busts and loses your stake, even if the dealer busts later.</li>
                <li>You play first, then each computer player in turn, then the dealer.</li>
              </ul>
            </section>

            <section className={styles.section} aria-labelledby="rules-dealer">
              <Text as="h3" id="rules-dealer" weight="semibold">Dealer and results</Text>
              <Text as="p">The dealer draws below 17 and stands on 17 or higher. Each hand is compared with the dealer's on its own: the higher total wins and equal totals push. A two-card 21 is a natural blackjack. If the dealer has a natural, the round ends at once: a player with a natural pushes and every other hand loses.</Text>
              <Text as="p">A winning hand is paid even money from the dealer's bank, and a natural blackjack is paid 3:2. On a push, the player gets their stake back. The dealer keeps a losing stake.</Text>
            </section>

            <section className={styles.section} aria-labelledby="rules-table">
              <Text as="h3" id="rules-table" weight="semibold">Meet the table</Text>
              <Text as="p">Choose up to {MAX_OPPONENTS} computer players from the Players menu. Each plays to its own temperament: nerve, aggression, discipline and tilt. Open a seat's info button to read a character's card.</Text>
              <Text as="p" size={200}>{NAME_CREDIT}</Text>
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
