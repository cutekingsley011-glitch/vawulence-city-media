import { Router, type IRouter } from "express";
import healthRouter from "./health";
import postsRouter from "./posts";
import categoriesRouter from "./categories";
import reactionsRouter from "./reactions";
import commentsRouter from "./comments";
import gistsRouter from "./gists";
import usersRouter from "./users";
import visitsRouter from "./visits";
import adminRouter from "./admin";
import voteCardsRouter from "./vote_cards";
import goatRouter from "./goat";
import trendingRouter from "./trending";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(postsRouter);
router.use(categoriesRouter);
router.use(reactionsRouter);
router.use(commentsRouter);
router.use(gistsRouter);
router.use(usersRouter);
router.use(visitsRouter);
router.use(adminRouter);
router.use(voteCardsRouter);
router.use(goatRouter);
router.use(trendingRouter);
router.use(leaderboardRouter);

export default router;
