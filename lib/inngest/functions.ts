import { inngest } from "./client";
import { createClient } from "@supabase/supabase-js";
import nodemailer from 'nodemailer';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PUBLIC_SITE_URL =
  process.env.PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})
const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@example.com';

export const sendChallengeEmail = inngest.createFunction(
  { id: "send-challenge-email" },
  { event: "match.new" },
  async ({ event, step }) => {
    const { matchId } = event.data;

    const match = await step.run("fetch-match", async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();
      return data;
    });

    if (!match) return;

    // Fetch opponent email (player2)
    const opponent = await step.run("fetch-opponent", async () => {
      const { data } = await supabase
        .from("player_profiles_view")
        .select("id, user_id, user_email, full_name")
        .eq("id", match.player2_id)
        .single();
      return data;
    });

    if (!opponent?.user_email) return;

    await step.run("send-email", async () => {
      const acceptUrl = `${PUBLIC_SITE_URL}/api/matches/${match.id}/action?action=accept&token=${match.action_token}`;
      const rejectUrl = `${PUBLIC_SITE_URL}/api/matches/${match.id}/action?action=reject&token=${match.action_token}`;

      const msg = {
        to: opponent.user_email,
        from: FROM_EMAIL, // Update this to your verified sender
        subject: `You were challenged in ${match.sport_id}`,
        html: `
          <p><strong>${match.player1_id}</strong> has challenged you in the ladder.</p>
          <p>${match.message ?? ""}</p>
          <p>
 <a href="${acceptUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px;">Accept Challenge</a>
 <a href="${rejectUrl}" style="background-color: #f44336; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px; margin-left: 10px;">Reject Challenge</a>
 </p>
        `,
      };
      const { error, info } = await transporter.sendMail(msg)
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
      return { error, info };
    });
  }
);

export const handleMatchAction = inngest.createFunction(
  { id: "handle-match-action" },
  { event: "match.action" },
  async ({ event, step }) => {
    const { matchId, action } = event.data;
    const isAccepted = action === "accept";

    const match = await step.run("fetch-match", async () => {
      const { data } = await supabase.from("matches").select("*").eq("id", matchId).single();
      return data;
    });

    if (!match) return;

    // Notify Challenger (player1) about the action
    const { challenger, opponent } = await step.run("fetch-challenger-and-opponent", async () => {
      const { data } = await supabase
        .from("player_profiles_view")
        .select("id, user_id, user_email, full_name") // Select all necessary fields
        .in("id", [match.player1_id, match.player2_id]); // Fetch both players

      const challenger = data?.find((p) => p.id === match.player1_id);
      const opponent = data?.find((p) => p.id === match.player2_id);

      return { challenger, opponent };
    });

    if (challenger?.user_email) {
      await step.run("send-email-notification", async () => {
        // Email to challenger
        if (isAccepted) {
          const subject = "Your challenge was accepted! Enter the result.";
          const profileLink = `${PUBLIC_SITE_URL}/profile`; // Changed to specific match link
          const submitResultUrl = `${PUBLIC_SITE_URL}/api/matches/${match.id}/submit-result`;

          // Email to challenger
          const challengerHtml = `
 <p>Your challenge for match ${match.id} was accepted!</p>
 <p>It's time to play your match. Once completed, please enter the result.</p>
 <p>Who won the match?</p>
 <p>
 <a href="${submitResultUrl}?winner_profile_id=${challenger.id}&token=${match.action_token}&reported_by=${challenger.id}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px;">${challenger.full_name} won</a>
 <a href="${submitResultUrl}?winner_profile_id=${opponent.id}&token=${match.action_token}&reported_by=${challenger.id}" style="background-color: #008CBA; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px; margin-left: 10px;">${opponent?.full_name} won</a>
 </p>
 <p>
 Or view the match details:
 <a href="${profileLink}" style="background-color: #008CBA; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px;">View Match</a>
 </p>
 `;

          const challengerMsg = {
            to: challenger.user_email,
            from: FROM_EMAIL,
            subject,
            html: challengerHtml,
          };
          await step.run("send-challenger-email", async () => {
            const { error, info } = await transporter.sendMail(challengerMsg)
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Email sent:', info.response);
            }
            return { error, info };
          });

          // Email to opponent (if available)
          if (opponent?.user_email) {
            const opponentHtml = `
 <p>You have accepted the challenge for match ${match.id}!</p>
 <p>It's time to play your match. Once completed, please enter the result.</p>
 <p>Who won the match?</p>
 <p>
 <a href="${submitResultUrl}?winner_profile_id=${challenger.id}&token=${match.action_token}&reported_by=${opponent.id}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px;">${challenger.full_name} won</a>
 <a href="${submitResultUrl}?winner_profile_id=${opponent.id}&token=${match.action_token}&reported_by=${opponent.id}" style="background-color: #008CBA; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px; margin-left: 10px;">${opponent?.full_name} won</a>
 </p>
 <p>
 Or view the match details:
 <a href="${profileLink}" style="background-color: #008CBA; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px;">View Match</a>
 </p>
 `;

            const opponentMsg = {
              to: opponent.user_email,
              from: FROM_EMAIL,
              subject,
              html: opponentHtml,
            };
            await step.run("send-opponent-email", async () => {
              const { error, info } = await transporter.sendMail(opponentMsg)
              if (error) {
                console.error('Error sending email:', error);
              } else {
                console.log('Email sent:', info.response);
              }
              return { error, info };
            });
          }
        } else {
          // If rejected, only notify the challenger
          const subject = `Your challenge was rejected by ${opponent?.full_name}`;
          const html = `<p>Your challenge for match ${match.id} was rejected by the opponent.</p>`;
          const msg = {
            to: challenger.user_email,
            from: FROM_EMAIL,
            subject,
            html,
          };
          await step.run("send-rejection-email", async () => {
            const { error, info } = await transporter.sendMail(msg)
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Email sent:', info.response);
            }
            return { error, info };
          });
        }
      });
    }
  }
);

export const handleMatchResult = inngest.createFunction(
  { id: "handle-match-result" },
  { event: "match.result" },
  async ({ event, step }) => {
    const { matchId } = event.data;

    const match = await step.run("fetch-match", async () => {
      const { data } = await supabase.from("matches").select("*").eq("id", matchId).single();
      return data;
    });

    if (!match) return;

    // Determine who needs to verify (the player who did NOT report the result)
    const verifierId = match.reported_by === match.player1_id ? match.player2_id : match.player1_id;

    const verifier = await step.run("fetch-verifier", async () => {
      const { data } = await supabase
        .from("player_profiles_view")
        .select("id, user_id, user_email, full_name")
        .eq("id", verifierId)
        .single();
      return data;
    });

    if (verifier?.user_email) {
      await step.run("send-verify-email", async () => {
        const verifyUrl = `${PUBLIC_SITE_URL}/api/matches/${match.id}/verify?token=${match.action_token}`;
        const confirmUrl = `${verifyUrl}&verify=yes`;
        const disputeUrl = `${verifyUrl}&verify=no`;

        const verifierIsWinner = match.winner_id === verifierId;

        const resultText = verifierIsWinner ? "You won" : "You lost";

        const msg = {
          to: verifier.user_email,
          from: FROM_EMAIL,
          subject: `Verify match result for challenge ${match.id}`,

          html: `
            <p>The result was entered by the opponent.</p>
            <p>Result: <strong>${resultText}</strong></p>
            <p>
 <a href="${confirmUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px;">Confirm Result</a>
 <a href="${disputeUrl}" style="background-color: #f44336; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px; margin-left: 10px;">Dispute Result</a>
 </p>
          `,
        };
        const { error, info } = await transporter.sendMail(msg)
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent:', info.response);
        }
        return { error, info };
      });
    }
  }
);

export const handleMatchVerification = inngest.createFunction(
  { id: "handle-match-verification" },
  { event: "match.verify" },
  async ({ event, step }) => {
    const { matchId, action } = event.data;
    const isConfirmed = action === "confirm";

    // Fetch match details along with player emails in one go
    const matchWithPlayers = await step.run("fetch-match-with-players", async () => {
      const { data } = await supabase
        .from("matches")
        .select(
          `
          *,
          player1:player_profiles_view!player1_id (user_email, full_name),
          player2:player_profiles_view!player2_id (user_email, full_name)
        `
        )
        .eq("id", matchId)
        .single();
      return data;
    });

    if (!matchWithPlayers) return;

    const player1 = matchWithPlayers.player1 as { user_email: string, full_name: string } | null;
    const player2 = matchWithPlayers.player2 as { user_email: string, full_name: string } | null;
    const emails = [player1?.user_email, player2?.user_email].filter(Boolean);

    if (emails.length > 0) {
      await step.run("send-completion-email", async () => {
        const matchIdentifier = `${player1?.full_name} vs ${player2?.full_name}`;

        const subject = isConfirmed ? `Match [${matchIdentifier}] Completed` : `Match [${matchIdentifier}] Disputed`;
        const profileLink = `${PUBLIC_SITE_URL}/profile`; // Changed to specific match link
        let html = isConfirmed
          ? `<p>The match result has been confirmed and the ladder updated.</p>`
          : `<p>The match result has been disputed. Please re-enter the result on the website.</p>
`;

        html += `<p>View the match details and updated ratings/rankings on the website:</p>
 <p><a href="${profileLink}" style="background-color: #008CBA; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px;">View Match</a></p>
 `;

        const msg = { to: emails, from: FROM_EMAIL, subject, html };
        const { error, info } = await transporter.sendMail(msg)
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent:', info.response);
        }
        return { error, info };
      });
    }
  }
);