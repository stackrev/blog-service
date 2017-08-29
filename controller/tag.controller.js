/*
*
* 标签控制器
*
*/

const redis = require('../redis');
const Tag = require('../model/tag.model');
const Article = require('../model/article.model');
const authIsVerified = require('../utils/auth');
// const buildSiteMap = require('np-utils/np-sitemap');
// const { baiduSeoPush, baiduSeoUpdate } = require('np-utils/np-baidu-seo-push');
const { handleRequest, handleError, handleSuccess, handleThrottle } = require('../utils/handle');
const tagCtrl = { list: {}, item: {} };
const config = require('../config');

let canGetTags = true;

// 查询标签列表
const getTags = ({ query, options, success_cb, err_cb, req }) => {

	// 查询article-tag的count聚合数据
	// const getTagsCount = tags => {
	// 	let $match = {};
	// 	if (req && !authIsVerified(req)) {
	// 		$match = { state: 1, public: 1 };
	// 	}
	// 	Article.aggregate([
	// 		{ $match },
	// 		{ $unwind : "$tag" }, 
	// 		{ $group: {
	// 			_id: "$tag", 
	// 			num_tutorial: { $sum : 1 }}
	// 		}
	// 	])
	// 	.then(counts => {
	// 		console.log(tags)
	// 		const newTags = tags.docs.map(t => {
	// 			const finded = counts.find(c => String(c._id) === String(t._id));
	// 			t.count = finded ? finded.num_tutorial : 0;
	// 			return t;
	// 		});
	// 		tags.docs = newTags;
	// 		if (success_cb) success_cb(tags);
	// 	})
	// 	.catch(err => {
	// 		if (success_cb) success_cb(tags);
	// 	})
	// };

	// 请求标签
	Tag.paginate(query, options).then(tags => {
		tags = JSON.parse(JSON.stringify(tags));
		// getTagsCount(tags);
	}).catch(err => {
		if (err_cb) err_cb(err);
	})
}

// 初始化
setTimeout(function() {
	getTags({ query: {}, options: { 
			sort: { _id: -1 },
			page: 1,
			limit: 160 
		}, 
		success_cb(tags) {
			redis.set('tags', tags);
		}
	});
}, 0);


// 获取标签列表
tagCtrl.list.GET = (req, res) => {

	let { page = 1, per_page = 12, keyword = '' } = req.query;

	// 过滤条件
	const options = {
		sort: { _id: -1 },
		page: Number(page),
		limit: Number(per_page)
	};

	// 查询参数
	const keywordReg = new RegExp(keyword);
	const query = {
		"$or": [
			{ 'name': keywordReg },
			{ 'description': keywordReg }
		]
	};

	// 成功响应
	const querySuccess = tags => {
		handleSuccess({
			res,
			message: '标签列表获取成功',
			result: {
				// pagination: {
				// 	total: tags.total,
				// 	current_page: options.page,
				// 	total_page: tags.pages,
				// 	per_page: options.limit
				// },
				data: tags
			}
		})
	};

	// 管理员请求
	if (authIsVerified(req)) {
		getTags({
			req, query, options,
			success_cb(tags) {
				querySuccess(tags);
			}, 
			err_cb(err) {
				handleError({ res, err, message: '标签列表获取失败' });
			}
		});
		return false;
	}

	// 前台请求缓存
	redis.get('tags', (err, tags) => {
		querySuccess(tags);
		if (canGetTags) {
			getTags({
				req, query, options,
				success_cb(tags) {
					redis.set('tags', tags);
				}, 
				err_cb(err) {
					handleError({ res, err, message: '标签列表获取失败' });
				}
			});
			canGetTags = false;
			setTimeout(function () {
				canGetTags = true;
			}, 1000 * 60 * 5)
		}
	});
};

// 发布标签
tagCtrl.list.POST = ({ body: tag, body: { name }}, res) => {

	// 验证
	if (name == undefined || name == null) {
		handleError({ res, message: '缺少name' });
		return false;
	};

	// 保存标签
	const saveTag = () => {
		new Tag(tag).save()
		.then((result = tag) => {
			handleSuccess({ res, result, message: '标签发布成功' });
			buildSiteMap();
			baiduSeoPush(`${config.INFO.site}/tag/${result.slug}`);
		})
		.catch(err => {
			handleError({ res, err, message: '标签发布失败' });
		})
	};

	// 验证Slug合法性
	Tag.find({ name })
	.then(({ length }) => {
		length ? handleError({ res, message: 'name已被占用' }) : saveTag();
	})
	.catch(err => {
		handleError({ res, err, message: '标签发布失败' });
	})
};

// // 批量删除标签
// tagCtrl.list.DELETE = ({ body: { tags }}, res) => {

// 	// 验证
// 	if (!tags || !tags.length) {
// 		handleError({ res, message: '缺少有效参数' });
// 		return false;
// 	};

// 	Tag.remove({ '_id': { $in: tags }})
// 	.then(result => {
// 		handleSuccess({ res, result, message: '标签批量删除成功' });
// 		buildSiteMap();
// 	})
// 	.catch(err => {
// 		handleError({ res, err, message: '标签批量删除失败' });
// 	})
// };

// 修改单个标签
tagCtrl.item.PUT = ({ params: { tag_id }, body: tag, body: { name }}, res) => {

	if (!name) {
		handleError({ res, message: 'slug不合法' });
		return false;
	};

	// 修改
	const putTag = () => {
		Tag.findByIdAndUpdate(tag_id, tag, { new: true })
		.then(result => {
			handleSuccess({ res, result, message: '标签修改成功' });
			// buildSiteMap();
			// baiduSeoUpdate(`${config.INFO.site}/tag/${result.slug}`);
		})
		.catch(err => {
			handleError({ res, err, message: '标签修改失败' });
		})
	};

	// 修改前判断name的唯一性，是否被占用
	Tag.find({ name })
	.then(([_tag]) => {
		const hasExisted = (_tag && (_tag._id != tag_id));
		hasExisted ? handleError({ res, message: 'slug已存在' }) : putTag();
	})
	.catch(err => {
		handleError({ res, err, message: '修改前查询失败' });
	})
};

// 删除单个标签
tagCtrl.item.DELETE = ({ params: { tag_id }}, res) => {
	Tag.findByIdAndRemove(tag_id)
	.then(result => {
		handleSuccess({ res, result, message: '标签删除成功' });
		buildSiteMap();
	})
	.catch(err => {
		handleError({ res, err, message: '标签删除失败' });
	})
};

// export
exports.list = ctx => { handleRequest({ req: ctx.request, res: ctx.response, controller: tagCtrl.list })};
exports.item = ctx => { handleRequest({ req: ctx.request, res: ctx.response, controller: tagCtrl.item })};
