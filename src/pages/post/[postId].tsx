import superjson from "superjson";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import { createContextInner } from "../../server/trpc/context";
import { appRouter } from "../../server/trpc/router/_app";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import defaultAvatar from "../../modules/user/default-avatar.jpeg";
import clsx from "clsx";
import { unstable_getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]";
import useGetPostById from "../../modules/post2/hooks/useGetPostById";
import useLikePostSingle from "../../modules/post2/hooks/useLikePostSingle";

export default function PostPage(
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  const { postId } = props;
  const { data: session } = useSession();
  const { data: post, isError, isLoading, error } = useGetPostById({ postId });

  const likePostMutation = useLikePostSingle({ postId });

  const isLiked =
    session?.user?.id && session?.user?.id === post?.likedBy[0]?.id;

  function handleLike() {
    likePostMutation.mutate({
      intent: isLiked ? "unlike" : "like",
      postId,
    });
  }

  if (isLoading) {
    return <div className="text-white">Loading...</div>;
  }

  if (isError) {
    return (
      <div className="text-white">Error: {JSON.stringify(error, null, 2)}</div>
    );
  }

  return (
    <div className="flex flex-col gap-3 bg-slate-900 p-8 text-white">
      <div className="flex gap-4">
        <Link href={`/user/${post.authorId}`}>
          <Image
            className="rounded-full"
            src={post.author.image || defaultAvatar}
            alt={`${post.author.name}'s Avatar`}
            width={80}
            height={80}
          />
        </Link>
        <Link className="text-2xl font-bold" href={`/user/${post.authorId}`}>
          {post.author.name}
        </Link>{" "}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-4xl">{post.text}</p>
        {session?.user?.id && (
          <div className="flex items-center gap-2">
            <button
              className={clsx("pointer text-lg", isLiked && "text-red-500")}
              onClick={handleLike}
            >
              {isLiked ? "♥" : "♡"}
            </button>
            <div>{post._count.likedBy}</div>
          </div>
        )}
      </div>
      <Link className="text-sm text-slate-400" href={`/post/${post.id}`}>
        {post.createdAt.toLocaleString()}
      </Link>
    </div>
  );
}

export async function getServerSideProps(
  context: GetServerSidePropsContext<{ postId: string }>,
) {
  const session = await unstable_getServerSession(
    context.req,
    context.res,
    authOptions,
  );

  const ssgHelper = createProxySSGHelpers({
    router: appRouter,
    ctx: await createContextInner({ session }),
    transformer: superjson,
  });

  const postId = context.params?.postId as string; // mention that this _works_ but feels like lying

  await ssgHelper.post.getOne.prefetch({ postId });

  return {
    props: {
      trpcState: ssgHelper.dehydrate(),
      postId,
      session,
    },
  };
}
